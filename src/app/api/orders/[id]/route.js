import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { generateNextToken } from "@/lib/tokens";
import mongoose from "mongoose";

const VALID_ORDER_STATUSES = [
  "Pending Approval",
  "Pending",
  "Accepted",
  "Preparing",
  "Ready for Pickup",
  "Ready",
  "Pickup Expired",
  "No-Show",
  "Completed",
  "Missed Pickup",
  "Rejected",
  "Cancelled"
];

const VALID_PAYMENT_STATUSES = ["Pending", "Paid"];

export async function PUT(request, context) {
  try {
    await connectToDatabase();
    const { id: orderId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ message: "Invalid order ID" }, { status: 400 });
    }

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const requestBody = await request.json();
    const updatePayload = {};

    // Ensure a vendor can only modify orders belonging to their own canteen
    if (requestBody.canteenId && requestBody.canteenId !== "all") {
      const orderCanteenId =
        existingOrder.canteenId || (existingOrder.items && existingOrder.items[0]?.canteenId);

      if (orderCanteenId && orderCanteenId !== requestBody.canteenId) {
        return NextResponse.json(
          { message: "Unauthorized. This order belongs to a different canteen vendor." },
          { status: 403 }
        );
      }
    }

    // Vendor acceptance flow: allocate a sequential token
    if (requestBody.action === "accept" || requestBody.orderStatus === "Accepted") {
      if (existingOrder.vendorApprovalStatus === "Accepted" && existingOrder.tokenNumber) {
        return NextResponse.json(
          { message: `Order has already been accepted with Token #${existingOrder.tokenNumber}` },
          { status: 400 }
        );
      }

      if (existingOrder.vendorApprovalStatus === "Rejected" || existingOrder.orderStatus === "Rejected") {
        return NextResponse.json(
          { message: "Cannot accept an order that has already been rejected." },
          { status: 400 }
        );
      }

      const assignedToken = await generateNextToken();
      updatePayload.tokenNumber = assignedToken;
      updatePayload.vendorApprovalStatus = "Accepted";
      updatePayload.orderStatus = "Accepted";
      updatePayload.approvedAt = new Date();
    }
    // Vendor rejection flow: keep tokenNumber null
    else if (requestBody.action === "reject" || requestBody.orderStatus === "Rejected") {
      if (existingOrder.vendorApprovalStatus === "Accepted" && !requestBody.adminOverride) {
        return NextResponse.json(
          { message: "Cannot reject an order that has already been accepted and assigned a token." },
          { status: 400 }
        );
      }

      if (existingOrder.vendorApprovalStatus === "Rejected" || existingOrder.orderStatus === "Rejected") {
        return NextResponse.json(
          { message: "Order has already been rejected." },
          { status: 400 }
        );
      }

      const declineReason = (
        requestBody.rejectionReason ||
        requestBody.cancellationReason ||
        "Declined by kitchen"
      )
        .toString()
        .trim();

      updatePayload.vendorApprovalStatus = "Rejected";
      updatePayload.orderStatus = "Rejected";
      updatePayload.rejectedAt = new Date();
      updatePayload.rejectionReason = declineReason;
      updatePayload.cancellationReason = declineReason;
    }
    // Regular kitchen status transitions (Preparing, Ready, Completed, No-Show, etc.)
    else if (requestBody.orderStatus !== undefined) {
      if (!VALID_ORDER_STATUSES.includes(requestBody.orderStatus)) {
        return NextResponse.json(
          {
            message: `Invalid orderStatus. Allowed values: ${VALID_ORDER_STATUSES.join(", ")}`
          },
          { status: 400 }
        );
      }

      if (requestBody.orderStatus === "Preparing" && !existingOrder.tokenNumber) {
        updatePayload.tokenNumber = await generateNextToken();
        updatePayload.vendorApprovalStatus = "Accepted";
        updatePayload.approvedAt = new Date();
      }

      if (
        (requestBody.orderStatus === "Cancelled" || requestBody.orderStatus === "Rejected") &&
        !requestBody.adminOverride
      ) {
        const isPendingApproval =
          existingOrder.orderStatus === "Pending" ||
          existingOrder.orderStatus === "Pending Approval" ||
          existingOrder.vendorApprovalStatus === "Pending";

        if (!isPendingApproval) {
          return NextResponse.json(
            {
              message: `Order cannot be cancelled because it is already "${existingOrder.orderStatus}". Only orders waiting for kitchen approval can be cancelled.`
            },
            { status: 400 }
          );
        }
      }

      if (
        requestBody.cancellationReason !== undefined ||
        requestBody.rejectionReason !== undefined
      ) {
        const reasonText = (
          requestBody.cancellationReason ||
          requestBody.rejectionReason ||
          ""
        )
          .toString()
          .trim();
        updatePayload.cancellationReason = reasonText;
        updatePayload.rejectionReason = reasonText;
      }

      // Prevent handover before payment is confirmed
      if (requestBody.orderStatus === "Completed") {
        const resolvedPaymentStatus = requestBody.paymentStatus || existingOrder.paymentStatus;
        if (resolvedPaymentStatus !== "Paid" && !requestBody.bypassPaymentCheck) {
          return NextResponse.json(
            {
              message: `Payment Pending (₹${existingOrder.totalAmount}). Order cannot be handed over until payment is marked as Paid.`
            },
            { status: 400 }
          );
        }
      }

      // Verify 4-digit pickup code at counter handover
      if (
        requestBody.orderStatus === "Completed" &&
        requestBody.verifyPickupCode !== undefined &&
        !requestBody.bypassVerification
      ) {
        const enteredCode = requestBody.verifyPickupCode.toString().trim();
        const expectedCode = existingOrder.pickupCode
          ? existingOrder.pickupCode.toString().trim()
          : "";

        if (expectedCode && enteredCode !== expectedCode) {
          return NextResponse.json(
            { message: `Invalid Pickup Code "${enteredCode}". Handover cannot be completed.` },
            { status: 400 }
          );
        }
      }

      // Start the 10-minute pickup window when the vendor marks the order ready
      if (requestBody.orderStatus === "Ready" || requestBody.orderStatus === "Ready for Pickup") {
        updatePayload.readyAt = new Date();
      }

      // Record verified no-show and update the student's COD trust status
      if (requestBody.action === "no_show" || requestBody.orderStatus === "No-Show") {
        updatePayload.orderStatus = "No-Show";
        updatePayload.isNoShow = true;
        updatePayload.noShowMarkedAt = new Date();

        if (existingOrder.studentPhone || existingOrder.studentEmail) {
          try {
            const Student = (await import("@/models/Student")).default;
            const studentLookupFilters = [];

            if (existingOrder.studentPhone) {
              const normalizedPhone = String(existingOrder.studentPhone).replace(/\D/g, "");
              if (normalizedPhone) studentLookupFilters.push({ phone: normalizedPhone });
            }
            if (existingOrder.studentEmail) {
              studentLookupFilters.push({
                email: existingOrder.studentEmail.toLowerCase().trim()
              });
            }

            if (studentLookupFilters.length > 0) {
              const student = await Student.findOne({ $or: studentLookupFilters });
              if (student) {
                const updatedNoShowCount = (student.noShowCount || 0) + 1;
                student.noShowCount = updatedNoShowCount;

                if (updatedNoShowCount < 3) {
                  student.codStatus = "warning";
                } else if (updatedNoShowCount === 3) {
                  student.codStatus = "temporarily_blocked";
                  student.codBlockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                } else {
                  student.codStatus = "prepaid_only";
                }

                await student.save();
              }
            }
          } catch (studentUpdateError) {
            console.error("Failed to update student trust score on No-Show:", studentUpdateError);
          }
        }
      }

      if (requestBody.orderStatus === "Missed Pickup") {
        updatePayload.missedAt = new Date();
      } else if (
        existingOrder.orderStatus === "Missed Pickup" &&
        (requestBody.orderStatus === "Ready" ||
          requestBody.orderStatus === "Ready for Pickup" ||
          requestBody.orderStatus === "Preparing")
      ) {
        updatePayload.rescheduleCount = (existingOrder.rescheduleCount || 0) + 1;
        updatePayload.missedAt = null;
      }

      updatePayload.orderStatus = requestBody.orderStatus;
    }

    if (requestBody.paymentStatus !== undefined) {
      if (!VALID_PAYMENT_STATUSES.includes(requestBody.paymentStatus)) {
        return NextResponse.json(
          {
            message: `Invalid paymentStatus. Allowed values: ${VALID_PAYMENT_STATUSES.join(", ")}`
          },
          { status: 400 }
        );
      }
      updatePayload.paymentStatus = requestBody.paymentStatus;
    }

    if (requestBody.paymentMethod !== undefined) {
      if (["Cash", "UPI"].includes(requestBody.paymentMethod)) {
        updatePayload.paymentMethod = requestBody.paymentMethod;
      }
    }

    if (requestBody.callOut || requestBody.action === "call_out") {
      updatePayload.calledAt = new Date();
      updatePayload.callCount = (existingOrder.callCount || 0) + 1;
    }

    if (requestBody.delayMinutes !== undefined) {
      updatePayload.delayMinutes = parseInt(requestBody.delayMinutes, 10) || 0;
    }

    if (requestBody.estimatedPrepTime !== undefined) {
      updatePayload.estimatedPrepTime = parseInt(requestBody.estimatedPrepTime, 10) || 5;
    }

    // Apply student rating to the order and recalculate each ordered menu item's average
    if (requestBody.rating !== undefined) {
      const clampedStars = Math.min(5, Math.max(1, parseInt(requestBody.rating, 10)));
      updatePayload.rating = clampedStars;
      updatePayload.ratedAt = new Date();

      if (Array.isArray(existingOrder.items) && existingOrder.items.length > 0) {
        try {
          const Menu = (await import("@/models/Menu")).default;

          for (const orderItem of existingOrder.items) {
            let menuItem = null;
            if (orderItem.menuItemId && mongoose.Types.ObjectId.isValid(orderItem.menuItemId)) {
              menuItem = await Menu.findById(orderItem.menuItemId);
            }
            if (!menuItem && orderItem.name) {
              menuItem = await Menu.findOne({ name: orderItem.name });
            }

            if (menuItem) {
              if (!Array.isArray(menuItem.ratings)) {
                menuItem.ratings = [];
              }

              const orderIdStr = existingOrder._id.toString();
              const existingRatingIndex = menuItem.ratings.findIndex(
                (ratingEntry) => ratingEntry.orderId && ratingEntry.orderId.toString() === orderIdStr
              );

              if (existingRatingIndex >= 0) {
                menuItem.ratings[existingRatingIndex].stars = clampedStars;
                menuItem.ratings[existingRatingIndex].createdAt = new Date();
              } else {
                menuItem.ratings.push({
                  orderId: orderIdStr,
                  studentEmail: existingOrder.studentEmail || "",
                  studentName: existingOrder.studentName || "",
                  stars: clampedStars,
                  createdAt: new Date()
                });
              }

              const baseRating = 4.5;
              const baseWeight = 5;
              const studentRatingsSum = menuItem.ratings.reduce(
                (totalStars, ratingEntry) => totalStars + (ratingEntry.stars || 5),
                0
              );
              const totalRatingsCount = baseWeight + menuItem.ratings.length;
              const newAverageRating =
                (baseRating * baseWeight + studentRatingsSum) / totalRatingsCount;

              menuItem.rating = Math.round(newAverageRating * 10) / 10;
              menuItem.ratingCount = totalRatingsCount;
              await menuItem.save();
            }
          }
        } catch (ratingUpdateError) {
          console.error("Failed to update menu ratings from order rating:", ratingUpdateError);
        }
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updatePayload, { new: true });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update order", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
