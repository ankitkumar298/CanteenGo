import { NextResponse } from "next/server";
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

    let menuItems = await Menu.find(filter).sort({ createdAt: -1 });

    // Seed default canteen menu items on first run when the collection is empty
    if (menuItems.length === 0 && (!canteenId || canteenId === "all")) {
      await Menu.insertMany(initialMenuItems);
      menuItems = await Menu.find().sort({ createdAt: -1 });
    } else {
      // Backfill missing metadata fields on legacy menu documents
      for (const menuItem of menuItems) {
        const defaultItemMatch = initialMenuItems.find(
          (seedItem) => seedItem.name.toLowerCase() === menuItem.name.toLowerCase()
        );
        const backfillFields = {};

        if (!menuItem.image) {
          backfillFields.image = defaultItemMatch ? defaultItemMatch.image : "/images/samosa.jpg";
        }
        if (!menuItem.category) {
          backfillFields.category = defaultItemMatch ? defaultItemMatch.category : "Hot Snacks";
        }
        if (!menuItem.description && defaultItemMatch && defaultItemMatch.description) {
          backfillFields.description = defaultItemMatch.description;
        }
        if (!menuItem.canteenId) {
          backfillFields.canteenId = "all";
          backfillFields.canteenName = "All Canteens";
          backfillFields.availableCanteens = [
            "foodcourt-34",
            "nk-foodcourt",
            "main-canteen",
            "library-cafe"
          ];
        }
        if (typeof menuItem.rating !== "number") {
          backfillFields.rating = 4.5;
          backfillFields.ratingCount = 12;
        }
        if (!menuItem.canteenPrices || Object.keys(menuItem.canteenPrices).length === 0) {
          const basePrice =
            menuItem.basePrice || (defaultItemMatch ? defaultItemMatch.price : menuItem.price) || 20;
          backfillFields.canteenPrices = {
            "foodcourt-34": basePrice,
            "nk-foodcourt": basePrice,
            "main-canteen": basePrice,
            "library-cafe": basePrice
          };
          backfillFields.basePrice = basePrice;
        }

        if (Object.keys(backfillFields).length > 0) {
          await Menu.findByIdAndUpdate(menuItem._id, backfillFields);
        }
      }

      menuItems = await Menu.find(filter).sort({ createdAt: -1 });
    }

    return NextResponse.json(menuItems, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch menu items", error: error.message },
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
      price,
      available,
      image,
      category,
      description,
      canteenId,
      canteenName,
      availableCanteens,
      foodType,
      isVeg
    } = requestBody;

    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Food item name is required" }, { status: 400 });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { message: "Please provide a valid positive price" },
        { status: 400 }
      );
    }

    const resolvedFoodType = foodType
      ? String(foodType).toLowerCase()
      : isVeg === false
        ? "non-veg"
        : "veg";
    const resolvedIsVeg = resolvedFoodType === "veg";

    const resolvedCanteenId = canteenId || "foodcourt-34";
    const resolvedCanteenName = canteenName || "Sports Complex Canteen";
    const resolvedAvailableCanteens =
      Array.isArray(availableCanteens) && availableCanteens.length > 0
        ? availableCanteens
        : [resolvedCanteenId];

    const createdMenuItem = await Menu.create({
      name: name.trim(),
      price: numericPrice,
      available: available !== undefined ? Boolean(available) : true,
      foodType: resolvedFoodType,
      isVeg: resolvedIsVeg,
      image: image && image.trim() !== "" ? image.trim() : "/images/samosa.jpg",
      category: category && category.trim() !== "" ? category.trim() : "Hot Snacks",
      description: description ? description.trim() : "",
      canteenId: resolvedCanteenId,
      canteenName: resolvedCanteenName,
      availableCanteens: resolvedAvailableCanteens,
      canteenPrices: { [resolvedCanteenId]: numericPrice },
      soldOutCanteens: available === false ? [resolvedCanteenId] : []
    });

    return NextResponse.json(createdMenuItem, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create menu item", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
