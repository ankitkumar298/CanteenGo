import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Canteen from "@/models/Canteen";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const canteens = await Canteen.find().sort({ createdAt: 1 });
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
    const body = await request.json();

    if (!body.name || !body.canteenId) {
      return NextResponse.json(
        { message: "name and canteenId are required" },
        { status: 400 }
      );
    }

    const newCanteen = await Canteen.create({
      ...body,
      id: body.id || body.canteenId
    });

    return NextResponse.json(newCanteen, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create canteen", error: error.message },
      { status: 500 }
    );
  }
}
