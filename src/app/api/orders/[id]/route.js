import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import mongoose from "mongoose";

const VALID_ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Completed",
  "Missed Pickup",
  "Cancelled"
];
const VALID_PAYMENT_STATUSES = ["Pending", "Paid"];

export async function PUT(request, context) {
  try {
    await connectToDatabase();
    const params = await context.params;
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: "Invalid order ID" }, { status: 400 });
    }

    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return Response.json({ message: "Order not found" }, { status: 404 });
    }

    const data = await request.json();
    const updateData = {};

    // Validate and update orderStatus
    if (data.orderStatus !== undefined) {
      if (!VALID_ORDER_STATUSES.includes(data.orderStatus)) {
        return Response.json(
          {
            message: `Invalid orderStatus. Allowed values: ${VALID_ORDER_STATUSES.join(", ")}`
          },
          { status: 400 }
        );
      }

      // Defined Cancellation Rule: Can only cancel if orderStatus is currently "Pending"
      if (data.orderStatus === "Cancelled" && !data.adminOverride) {
        if (existingOrder.orderStatus !== "Pending") {
          return Response.json(
            {
              message: `Order cannot be cancelled because it is already "${existingOrder.orderStatus}". Only Pending orders can be cancelled before kitchen preparation starts.`
            },
            { status: 400 }
          );
        }
      }

      if (data.cancellationReason !== undefined) {
        updateData.cancellationReason = data.cancellationReason.toString().trim();
      }

      // Feature: Unpaid Handover Protection Rule - Cannot handover until Paid!
      if (data.orderStatus === "Completed") {
        const finalPaymentStatus = data.paymentStatus || existingOrder.paymentStatus;
        if (finalPaymentStatus !== "Paid" && !data.bypassPaymentCheck) {
          return Response.json(
            {
              message: `Payment Pending (₹${existingOrder.totalAmount}). Order cannot be handed over until payment is collected and marked as Paid.`
            },
            { status: 400 }
          );
        }
      }

      // Feature: Secure Pickup Verification Code check
      if (data.orderStatus === "Completed" && data.verifyPickupCode !== undefined && !data.bypassVerification) {
        const inputCode = data.verifyPickupCode.toString().trim();
        const expectedCode = existingOrder.pickupCode ? existingOrder.pickupCode.toString().trim() : "";
        if (expectedCode && inputCode !== expectedCode) {
          return Response.json(
            { message: `Invalid Pickup Code "${inputCode}". Handover cannot be completed.` },
            { status: 400 }
          );
        }
      }

      // Feature: Missed Pickup & Auto-Requeue
      if (data.orderStatus === "Missed Pickup") {
        updateData.missedAt = new Date();
      } else if (existingOrder.orderStatus === "Missed Pickup" && (data.orderStatus === "Ready" || data.orderStatus === "Preparing")) {
        // Student rescheduled their pickup!
        updateData.rescheduleCount = (existingOrder.rescheduleCount || 0) + 1;
        updateData.missedAt = null;
      }

      updateData.orderStatus = data.orderStatus;
    }

    // Validate and update paymentStatus
    if (data.paymentStatus !== undefined) {
      if (!VALID_PAYMENT_STATUSES.includes(data.paymentStatus)) {
        return Response.json(
          {
            message: `Invalid paymentStatus. Allowed values: ${VALID_PAYMENT_STATUSES.join(", ")}`
          },
          { status: 400 }
        );
      }
      updateData.paymentStatus = data.paymentStatus;
    }

    // Optional update paymentMethod
    if (data.paymentMethod !== undefined) {
      if (["Cash", "UPI"].includes(data.paymentMethod)) {
        updateData.paymentMethod = data.paymentMethod;
      }
    }

    if (data.delayMinutes !== undefined) {
      updateData.delayMinutes = parseInt(data.delayMinutes, 10) || 0;
    }

    if (data.estimatedPrepTime !== undefined) {
      updateData.estimatedPrepTime = parseInt(data.estimatedPrepTime, 10) || 5;
    }

    // Rate completed order (1 to 5 stars) and update menu item ratings
    if (data.rating !== undefined) {
      const stars = Math.min(5, Math.max(1, parseInt(data.rating, 10)));
      updateData.rating = stars;
      updateData.ratedAt = new Date();

      if (Array.isArray(existingOrder.items) && existingOrder.items.length > 0) {
        try {
          const Menu = (await import("@/models/Menu")).default;
          for (const it of existingOrder.items) {
            let menuItem = null;
            if (it.menuItemId && mongoose.Types.ObjectId.isValid(it.menuItemId)) {
              menuItem = await Menu.findById(it.menuItemId);
            }
            if (!menuItem && it.name) {
              menuItem = await Menu.findOne({ name: it.name });
            }

            if (menuItem) {
              if (!Array.isArray(menuItem.ratings)) {
                menuItem.ratings = [];
              }
              const orderIdStr = existingOrder._id.toString();
              const existingIdx = menuItem.ratings.findIndex(
                (r) => r.orderId && r.orderId.toString() === orderIdStr
              );

              if (existingIdx >= 0) {
                menuItem.ratings[existingIdx].stars = stars;
                menuItem.ratings[existingIdx].createdAt = new Date();
              } else {
                menuItem.ratings.push({
                  orderId: orderIdStr,
                  studentEmail: existingOrder.studentEmail || "",
                  studentName: existingOrder.studentName || "",
                  stars: stars,
                  createdAt: new Date()
                });
              }

              const baseRating = 4.5;
              const baseWeight = 5;
              const studentRatingsSum = menuItem.ratings.reduce((acc, r) => acc + (r.stars || 5), 0);
              const totalRatingsCount = baseWeight + menuItem.ratings.length;
              const newAvg = (baseRating * baseWeight + studentRatingsSum) / totalRatingsCount;

              menuItem.rating = Math.round(newAvg * 10) / 10;
              menuItem.ratingCount = totalRatingsCount;
              await menuItem.save();
            }
          }
        } catch (ratingErr) {
          console.error("Failed to update menu ratings from order rating:", ratingErr);
        }
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true });

    return Response.json(updatedOrder, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: "Failed to update order", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
