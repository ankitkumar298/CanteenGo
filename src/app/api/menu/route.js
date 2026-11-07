import { connectToDatabase } from "@/lib/mongodb";
import Menu from "@/models/Menu";

const initialMenuItems = [
  {
    name: "Hot Samosa (with Chutney)",
    price: 15,
    available: true,
    image: "/images/samosa.jpg",
    category: "Hot Snacks",
    description: "Crispy golden crust filled with spiced potatoes & peas, served with fresh mint & tamarind chutneys."
  },
  {
    name: "Masala Chai",
    price: 10,
    available: true,
    image: "/images/chai.jpg",
    category: "Beverages",
    description: "Authentic college cutting chai slow-brewed with ginger, crushed cardamom & rich milk."
  },
  {
    name: "Crispy Veg Patty",
    price: 20,
    available: true,
    image: "/images/patty.jpg",
    category: "Hot Snacks",
    description: "Golden flaky puff pastry stuffed with savory mashed potatoes, cumin & tender green peas."
  },
  {
    name: "Paneer Roll",
    price: 40,
    available: true,
    image: "/images/roll.jpg",
    category: "Meals & Wraps",
    description: "Grilled spiced paneer cubes wrapped with crunchy onions & tangy mint chutney in a fresh paratha."
  },
  {
    name: "Cheese Maggi",
    price: 35,
    available: true,
    image: "/images/maggi.jpg",
    category: "Meals & Wraps",
    description: "Steaming bowl of 2-minute masala Maggi loaded with vegetables and melted cheese."
  },
  {
    name: "Cold Coffee",
    price: 30,
    available: true,
    image: "/images/coffee.jpg",
    category: "Beverages",
    description: "Chilled thick blended coffee topped with chocolate syrup swirl and creamy froth."
  },
  {
    name: "Veg Cheese Sandwich",
    price: 45,
    available: true,
    image: "/images/sandwich.jpg",
    category: "Meals & Wraps",
    description: "Freshly grilled triangular sandwich stuffed with cheese, cucumber, tomato & coriander pesto."
  }
];

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const canteenId = searchParams.get("canteenId");

    let filter = {};
    if (canteenId && canteenId !== "all") {
      filter = {
        $or: [
          { canteenId: canteenId },
          { canteenId: "all" },
          { availableCanteens: canteenId },
          { availableCanteens: "all" },
          { availableCanteens: { $size: 0 } },
          { canteenId: { $exists: false } }
        ]
      };
    }

    let items = await Menu.find(filter).sort({ createdAt: -1 });

    // Seed default canteen menu items if collection is empty
    if (items.length === 0 && (!canteenId || canteenId === "all")) {
      await Menu.insertMany(initialMenuItems);
      items = await Menu.find().sort({ createdAt: -1 });
    } else {
    // Backfill image, category, and description if any existing items lack them
    for (const item of items) {
      const match = initialMenuItems.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );
      const updates = {};
      if (!item.image) {
        updates.image = match ? match.image : "/images/samosa.jpg";
      }
      if (!item.category) {
        updates.category = match ? match.category : "Hot Snacks";
      }
      if (!item.description && match && match.description) {
        updates.description = match.description;
      }
      if (!item.canteenId) {
        updates.canteenId = "all";
        updates.canteenName = "All Canteens";
        updates.availableCanteens = ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"];
      }
      if (typeof item.rating !== "number") {
        updates.rating = 4.5;
        updates.ratingCount = 12;
      }
      if (!item.canteenPrices || Object.keys(item.canteenPrices).length === 0) {
        const base = item.basePrice || (match ? match.price : item.price) || 20;
        updates.canteenPrices = {
          "foodcourt-34": base,
          "nk-foodcourt": base,
          "main-canteen": base,
          "library-cafe": base
        };
        updates.basePrice = base;
      }

      if (Object.keys(updates).length > 0) {
        await Menu.findByIdAndUpdate(item._id, updates);
      }
    }

      // Return fresh list after updates
      items = await Menu.find(filter).sort({ createdAt: -1 });
    }

    return Response.json(items, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: "Failed to fetch menu items", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    const { name, price, available, image, category, description, canteenId, canteenName, availableCanteens } = data;

    // Validation
    if (!name || name.trim() === "") {
      return Response.json({ message: "Food item name is required" }, { status: 400 });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return Response.json({ message: "Please provide a valid positive price" }, { status: 400 });
    }

    const resolvedCanteenId = canteenId || "foodcourt-34";
    const resolvedCanteenName = canteenName || "Food Court near 34 Block";
    const resolvedAvailableCanteens = Array.isArray(availableCanteens) && availableCanteens.length > 0
      ? availableCanteens
      : [resolvedCanteenId];

    const newItem = await Menu.create({
      name: name.trim(),
      price: numericPrice,
      available: available !== undefined ? Boolean(available) : true,
      image: image && image.trim() !== "" ? image.trim() : "/images/samosa.jpg",
      category: category && category.trim() !== "" ? category.trim() : "Hot Snacks",
      description: description ? description.trim() : "",
      canteenId: resolvedCanteenId,
      canteenName: resolvedCanteenName,
      availableCanteens: resolvedAvailableCanteens,
      canteenPrices: { [resolvedCanteenId]: numericPrice },
      soldOutCanteens: available === false ? [resolvedCanteenId] : []
    });

    return Response.json(newItem, { status: 201 });
  } catch (error) {
    return Response.json(
      { message: "Failed to create menu item", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
