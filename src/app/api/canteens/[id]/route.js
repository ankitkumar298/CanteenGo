import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Canteen from "@/models/Canteen";
import mongoose from "mongoose";

const ADMIN_PASSCODE = process.env.ADMIN_PIN || "admin123";

export async function PUT(request, context) {
  try {
    await connectToDatabase();
    const { id: canteenRecordId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(canteenRecordId)) {
      return NextResponse.json({ success: false, message: "Invalid canteen ID" }, { status: 400 });
    }

    const requestBody = await request.json();
    const { action, adminPin, reason } = requestBody;

    if (adminPin !== ADMIN_PASSCODE) {
      return NextResponse.json(
        { success: false, message: "Invalid College Admin passcode." },
        { status: 401 }
      );
    }

    const canteen = await Canteen.findById(canteenRecordId);
    if (!canteen) {
      return NextResponse.json({ success: false, message: "Canteen not found" }, { status: 404 });
    }

    if (action === "approve") {
      canteen.approvalStatus = "Approved";
      canteen.isApproved = true;
      canteen.isOpen = true;
      canteen.isAvailable = true;
      canteen.approvedAt = new Date();
      canteen.rejectionReason = "";
      await canteen.save();

      return NextResponse.json(
        {
          success: true,
          message: `${canteen.name} has been approved and is now live on campus!`,
          canteen
        },
        { status: 200 }
      );
    }

    if (action === "reject") {
      canteen.approvalStatus = "Rejected";
      canteen.isApproved = false;
      canteen.isOpen = false;
      canteen.isAvailable = false;
      canteen.rejectionReason = String(reason || "Declined by College Admin").trim();
      await canteen.save();

      return NextResponse.json(
        {
          success: true,
          message: `${canteen.name} application has been rejected.`,
          canteen
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Invalid action. Use 'approve' or 'reject'." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update canteen approval status", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    await connectToDatabase();
    const { id: canteenRecordId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(canteenRecordId)) {
      return NextResponse.json({ success: false, message: "Invalid canteen ID" }, { status: 400 });
    }

    const deleted = await Canteen.findByIdAndDelete(canteenRecordId);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Canteen not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Canteen record deleted." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete canteen", error: error.message },
      { status: 500 }
    );
  }
}
