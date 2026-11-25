import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Menu from "@/models/Menu";
import mongoose from "mongoose";

export async function PUT(request, context) {
  try {
    await connectToDatabase();
    const { id: menuItemId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return NextResponse.json({ message: "Invalid menu item ID" }, { status: 400 });
    }

    const requestBody = await request.json();
    const updatePayload = {};

    const existingMenuItem = await Menu.findById(menuItemId);
    if (!existingMenuItem) {
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 });
    }

    // Update only the requesting canteen's price so other canteens keep their own pricing
    if (
      requestBody.canteenId &&
      (requestBody.canteenPrice !== undefined || requestBody.price !== undefined)
    ) {
      const parsedCanteenPrice = Number(
        requestBody.canteenPrice !== undefined ? requestBody.canteenPrice : requestBody.price
      );
      if (!isNaN(parsedCanteenPrice) && parsedCanteenPrice >= 0) {
        const updatedCanteenPrices = { ...(existingMenuItem.canteenPrices || {}) };
        const fallbackPrice =
          existingMenuItem.basePrice || existingMenuItem.price || parsedCanteenPrice;
        const campusCanteenIds = ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"];

        campusCanteenIds.forEach((campusCanteenId) => {
          if (updatedCanteenPrices[campusCanteenId] === undefined) {
            updatedCanteenPrices[campusCanteenId] = fallbackPrice;
          }
        });

        updatedCanteenPrices[requestBody.canteenId] = parsedCanteenPrice;
        updatePayload.canteenPrices = updatedCanteenPrices;
      }
    } else if (requestBody.price !== undefined) {
      const numericPrice = Number(requestBody.price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return NextResponse.json(
          { message: "Price must be a valid positive number" },
          { status: 400 }
        );
      }
      updatePayload.price = numericPrice;
      updatePayload.basePrice = numericPrice;
    }

    // Toggle stock availability per canteen without disabling the item globally
    if (requestBody.canteenId && requestBody.canteenAvailable !== undefined) {
      let soldOutCanteensList = Array.isArray(existingMenuItem.soldOutCanteens)
        ? [...existingMenuItem.soldOutCanteens]
        : [];

      if (requestBody.canteenAvailable === false) {
        if (!soldOutCanteensList.includes(requestBody.canteenId)) {
          soldOutCanteensList.push(requestBody.canteenId);
        }
      } else {
        soldOutCanteensList = soldOutCanteensList.filter(
          (soldOutCanteenId) => soldOutCanteenId !== requestBody.canteenId
        );
      }

      updatePayload.soldOutCanteens = soldOutCanteensList;
      updatePayload.available = true;
    } else if (requestBody.available !== undefined) {
      updatePayload.available = Boolean(requestBody.available);
    }

    if (requestBody.canteenPrices !== undefined && typeof requestBody.canteenPrices === "object") {
      updatePayload.canteenPrices = requestBody.canteenPrices;
    }

    if (requestBody.soldOutCanteens !== undefined && Array.isArray(requestBody.soldOutCanteens)) {
      updatePayload.soldOutCanteens = requestBody.soldOutCanteens;
    }

    if (requestBody.name !== undefined) {
      updatePayload.name = String(requestBody.name).trim();
    }

    if (requestBody.foodType !== undefined) {
      updatePayload.foodType = String(requestBody.foodType).toLowerCase();
      updatePayload.isVeg = updatePayload.foodType === "veg";
    } else if (requestBody.isVeg !== undefined) {
      updatePayload.isVeg = Boolean(requestBody.isVeg);
      updatePayload.foodType = updatePayload.isVeg ? "veg" : "non-veg";
    }

    if (requestBody.category !== undefined) {
      updatePayload.category = String(requestBody.category).trim() || "Snacks";
    }

    if (requestBody.image !== undefined) {
      updatePayload.image = String(requestBody.image).trim();
    }

    if (requestBody.description !== undefined) {
      updatePayload.description = String(requestBody.description).trim();
    }

    if (requestBody.canteenId !== undefined) {
      updatePayload.canteenId = String(requestBody.canteenId).trim();
    }

    if (requestBody.canteenName !== undefined) {
      updatePayload.canteenName = String(requestBody.canteenName).trim();
    }

    if (requestBody.availableCanteens !== undefined && Array.isArray(requestBody.availableCanteens)) {
      updatePayload.availableCanteens = requestBody.availableCanteens;
    }

    const updatedMenuItem = await Menu.findByIdAndUpdate(menuItemId, updatePayload, { new: true });

    if (!updatedMenuItem) {
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json(updatedMenuItem, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update menu item", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    await connectToDatabase();
    const { id: menuItemId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return NextResponse.json({ message: "Invalid menu item ID" }, { status: 400 });
    }

    const deletedMenuItem = await Menu.findByIdAndDelete(menuItemId);

    if (!deletedMenuItem) {
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Menu item deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete menu item", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
