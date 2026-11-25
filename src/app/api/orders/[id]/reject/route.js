import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import mongoose from "mongoose";

export async function POST(request, context) {
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

    const requestBody = await request.json().catch(() => ({}));

    // Ensure a vendor can only reject orders belonging to their own canteen
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

    if (existingOrder.vendorApprovalStatus === "Accepted" && !requestBody.adminOverride) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot reject an order that has already been accepted and assigned a token."
        },
        { status: 400 }
      );
    }

    if (existingOrder.vendorApprovalStatus === "Rejected" || existingOrder.orderStatus === "Rejected") {
      return NextResponse.json(
        { success: false, message: "Order has already been rejected.", order: existingOrder },
        { status: 400 }
      );
    }

    const declineReason = (
      requestBody.reason ||
      requestBody.rejectionReason ||
      requestBody.cancellationReason ||
      "Declined by kitchen"
    )
      .toString()
      .trim();

    existingOrder.vendorApprovalStatus = "Rejected";
    existingOrder.orderStatus = "Rejected";
    existingOrder.rejectedAt = new Date();
    existingOrder.rejectionReason = declineReason;
    existingOrder.cancellationReason = declineReason;
    // Keep tokenNumber null on rejection so the partial unique index ignores it

    await existingOrder.save();

    return NextResponse.json(
      {
        success: true,
        message: "Order has been rejected. Student notified.",
        order: existingOrder
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to reject order", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

