import { connectToDatabase } from "@/lib/mongodb";
import Menu from "@/models/Menu";
import mongoose from "mongoose";

export async function PUT(request, context) {
  try {
    await connectToDatabase();
    const params = await context.params;
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: "Invalid menu item ID" }, { status: 400 });
    }

    const data = await request.json();
    const updateData = {};

    const existing = await Menu.findById(id);
    if (!existing) {
      return Response.json({ message: "Menu item not found" }, { status: 404 });
    }

    // Per-canteen price update
    if (data.canteenId && (data.canteenPrice !== undefined || data.price !== undefined)) {
      const p = Number(data.canteenPrice !== undefined ? data.canteenPrice : data.price);
      if (!isNaN(p) && p >= 0) {
        const cp = { ...(existing.canteenPrices || {}) };
        cp[data.canteenId] = p;
        updateData.canteenPrices = cp;
        updateData.price = p;
      }
    } else if (data.price !== undefined) {
      const numericPrice = Number(data.price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return Response.json({ message: "Price must be a valid positive number" }, { status: 400 });
      }
      updateData.price = numericPrice;
    }

    // Per-canteen availability toggle (e.g. NK Food Court marking sold out)
    if (data.canteenId && data.canteenAvailable !== undefined) {
      let soldOut = Array.isArray(existing.soldOutCanteens) ? [...existing.soldOutCanteens] : [];
      if (data.canteenAvailable === false) {
        if (!soldOut.includes(data.canteenId)) {
          soldOut.push(data.canteenId);
        }
      } else {
        soldOut = soldOut.filter((c) => c !== data.canteenId);
      }
      updateData.soldOutCanteens = soldOut;
      updateData.available = true; // Keep global document active for other canteens
    } else if (data.available !== undefined) {
      updateData.available = Boolean(data.available);
    }

    if (data.canteenPrices !== undefined && typeof data.canteenPrices === "object") {
      updateData.canteenPrices = data.canteenPrices;
    }

    if (data.soldOutCanteens !== undefined && Array.isArray(data.soldOutCanteens)) {
      updateData.soldOutCanteens = data.soldOutCanteens;
    }

    if (data.category !== undefined) {
      updateData.category = String(data.category).trim() || "Snacks";
    }

    if (data.image !== undefined) {
      updateData.image = String(data.image).trim();
    }

    if (data.description !== undefined) {
      updateData.description = String(data.description).trim();
    }

    if (data.canteenId !== undefined) {
      updateData.canteenId = String(data.canteenId).trim();
    }

    if (data.canteenName !== undefined) {
      updateData.canteenName = String(data.canteenName).trim();
    }

    if (data.availableCanteens !== undefined && Array.isArray(data.availableCanteens)) {
      updateData.availableCanteens = data.availableCanteens;
    }

    const updatedItem = await Menu.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedItem) {
      return Response.json({ message: "Menu item not found" }, { status: 404 });
    }

    return Response.json(updatedItem, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: "Failed to update menu item", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    await connectToDatabase();
    const params = await context.params;
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: "Invalid menu item ID" }, { status: 400 });
    }

    const deletedItem = await Menu.findByIdAndDelete(id);

    if (!deletedItem) {
      return Response.json({ message: "Menu item not found" }, { status: 404 });
    }

    return Response.json({ message: "Menu item deleted successfully" }, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: "Failed to delete menu item", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
