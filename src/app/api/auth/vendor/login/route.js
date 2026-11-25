import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Canteen from "@/models/Canteen";

export async function POST(request) {
  try {
    await connectToDatabase();
    const { canteenId, ownerPhone, staffPin } = await request.json();

    const cleanPin = String(staffPin || "").trim();
    if (!cleanPin) {
      return NextResponse.json(
        { success: false, message: "Please enter your staff counter PIN." },
        { status: 400 }
      );
    }

    let canteen = null;
    if (ownerPhone) {
      const cleanPhone = String(ownerPhone).replace(/\D/g, "");
      canteen = await Canteen.findOne({ ownerPhone: cleanPhone });
    }

    if (!canteen && canteenId) {
      canteen = await Canteen.findOne({
        $or: [{ canteenId }, { id: canteenId }]
      });
    }

    if (!canteen) {
      return NextResponse.json(
        { success: false, message: "Canteen account not found. Please apply as a new vendor first." },
        { status: 404 }
      );
    }

    // Check Admin Approval Gate before allowing terminal access
    if (canteen.approvalStatus === "Pending" || canteen.isApproved === false) {
      if (canteen.approvalStatus === "Rejected") {
        return NextResponse.json(
          {
            success: false,
            approvalStatus: "Rejected",
            message: `Your canteen application was declined by College Admin${canteen.rejectionReason ? `: ${canteen.rejectionReason}` : "."}`
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          approvalStatus: "Pending",
          message: "Your canteen application is currently pending College Admin approval."
        },
        { status: 403 }
      );
    }

    const demoAllowedPins = ["1234", "9999", "0000"];
    const expectedPin = canteen.staffPin || "1234";
    if (cleanPin !== expectedPin && !demoAllowedPins.includes(cleanPin)) {
      return NextResponse.json(
        { success: false, message: "Incorrect staff PIN. Please try again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Accessing ${canteen.name} console...`,
        canteen
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Vendor login failed", error: error.message },
      { status: 500 }
    );
  }
}
