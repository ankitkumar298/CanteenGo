import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Canteen from "@/models/Canteen";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    // Show canteens where Admin has approved (isApprove: 1, or legacy docs without isApprove: 0)
    const canteens = await Canteen.find({ isApprove: { $ne: 0 } }).sort({ createdAt: -1 });
    return NextResponse.json(canteens, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch canteens", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const requestBody = await request.json();

    const {
      name,
      location,
      counter,
      ownerName,
      ownerPhone,
      staffPin,
      openingHours,
      description
    } = requestBody;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { success: false, message: "Canteen name is required." },
        { status: 400 }
      );
    }

    if (!ownerName || !String(ownerName).trim()) {
      return NextResponse.json(
        { success: false, message: "Owner / manager name is required." },
        { status: 400 }
      );
    }

    const cleanPhone = String(ownerPhone || "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 10-digit owner mobile number." },
        { status: 400 }
      );
    }

    const cleanPin = String(staffPin || "").trim();
    if (cleanPin.length < 4) {
      return NextResponse.json(
        { success: false, message: "Staff PIN must be at least 4 characters." },
        { status: 400 }
      );
    }

    const existingByPhone = await Canteen.findOne({ ownerPhone: cleanPhone });
    if (existingByPhone) {
      const statusLabel = existingByPhone.isApprove === 1 ? "Approved" : "Pending Admin Approval";
      return NextResponse.json(
        {
          success: false,
          message: `A canteen application (${existingByPhone.name}) is already registered with this mobile number (${statusLabel}).`
        },
        { status: 409 }
      );
    }

    const cleanName = String(name).trim();
    const slugBase = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const generatedCanteenId = requestBody.canteenId || `${slugBase}-${Date.now().toString().slice(-4)}`;

    // New vendor starts with isApprove: 0; becomes live when Admin sets isApprove: 1 in MongoDB
    const newCanteen = await Canteen.create({
      canteenId: generatedCanteenId,
      id: generatedCanteenId,
      name: cleanName,
      shortName: cleanName,
      location: String(location || "Campus Block").trim(),
      counter: String(counter || "Counter 1 (Main Pickup)").trim(),
      counterDetails: String(counter || "Counter 1 • Express Pickup").trim(),
      openingHours: String(openingHours || "9:00 AM - 9:00 PM").trim(),
      description: String(description || "Newly registered campus canteen").trim(),
      ownerName: String(ownerName).trim(),
      ownerPhone: cleanPhone,
      staffPin: cleanPin,
      isApprove: 0,
      isOpen: true,
      isAvailable: true,
      icon: "🏪"
    });

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted! Once Admin approves your account in MongoDB (isApprove = 1), your canteen will be added to the vendor list.",
        canteen: newCanteen
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to submit vendor application", error: error.message },
      { status: 500 }
    );
  }
}
