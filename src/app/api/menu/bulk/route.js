import { connectToDatabase } from "@/lib/mongodb";
import Menu from "@/models/Menu";

export async function PUT(request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const { canteenId, action } = data;

    if (!canteenId) {
      return Response.json({ message: "canteenId is required" }, { status: 400 });
    }

    if (action === "mark-all-soldout") {
      // Add this canteen to soldOutCanteens for all items
      await Menu.updateMany({}, {
        $addToSet: { soldOutCanteens: canteenId }
      });
      return Response.json({ message: `All items marked as Sold Out for ${canteenId}` }, { status: 200 });
    }

    if (action === "mark-all-available") {
      // Remove this canteen from soldOutCanteens for all items
      await Menu.updateMany({}, {
        $pull: { soldOutCanteens: canteenId }
      });
      return Response.json({ message: `All items marked as Available for ${canteenId}` }, { status: 200 });
    }

    return Response.json({ message: "Invalid action. Use 'mark-all-available' or 'mark-all-soldout'" }, { status: 400 });
  } catch (error) {
    return Response.json({ message: "Failed to perform bulk stock update", error: error.message }, { status: 500 });
  }
}

