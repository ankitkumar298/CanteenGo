import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Menu from "@/models/Menu";

export async function PUT(request) {
  try {
    await connectToDatabase();
    const { canteenId, action } = await request.json();

    if (!canteenId) {
      return NextResponse.json({ message: "canteenId is required" }, { status: 400 });
    }

    if (action === "mark-all-soldout") {
      await Menu.updateMany({}, {
        $addToSet: { soldOutCanteens: canteenId }
      });
      return NextResponse.json(
        { message: `All items marked as Sold Out for ${canteenId}` },
        { status: 200 }
      );
    }

    if (action === "mark-all-available") {
      await Menu.updateMany({}, {
        $pull: { soldOutCanteens: canteenId }
      });
      return NextResponse.json(
        { message: `All items marked as Available for ${canteenId}` },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Invalid action. Use 'mark-all-available' or 'mark-all-soldout'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to perform bulk stock update", error: error.message },
      { status: 500 }
    );
  }
}

