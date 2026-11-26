import { NextResponse } from "next/server";
import { generateTimeSlots } from "@/lib/timeslots";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const canteenId = searchParams.get("canteenId") || "foodcourt-34";
    const timeZone = searchParams.get("tz") || "Asia/Kolkata";

    const availableSlots = generateTimeSlots(canteenId, new Date(), 12, timeZone);

    return NextResponse.json(
      {
        success: true,
        canteenId,
        slots: availableSlots
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to generate time slots", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

