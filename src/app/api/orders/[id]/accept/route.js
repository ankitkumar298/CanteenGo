import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { generateNextToken } from "@/lib/tokens";
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

    // Ensure a vendor can only accept orders belonging to their own canteen
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

    if (existingOrder.vendorApprovalStatus === "Accepted" && existingOrder.tokenNumber) {
      return NextResponse.json(
        {
          success: false,
          message: `Order has already been accepted with Token #${existingOrder.tokenNumber}`,
          order: existingOrder
        },
        { status: 400 }
      );
    }

    if (existingOrder.vendorApprovalStatus === "Rejected" || existingOrder.orderStatus === "Rejected") {
      return NextResponse.json(
        { success: false, message: "Cannot accept an order that has already been rejected." },
        { status: 400 }
      );
    }

    const assignedToken = await generateNextToken();

    existingOrder.tokenNumber = assignedToken;
    existingOrder.vendorApprovalStatus = "Accepted";
    existingOrder.orderStatus = "Accepted";
    existingOrder.approvedAt = new Date();

    await existingOrder.save();

    return NextResponse.json(
      {
        success: true,
        message: `Order accepted successfully. Token #${assignedToken} assigned.`,
        tokenNumber: assignedToken,
        order: existingOrder
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to accept order", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

