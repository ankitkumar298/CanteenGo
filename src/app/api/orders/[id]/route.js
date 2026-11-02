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
