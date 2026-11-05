import { connectToDatabase } from "@/lib/mongodb";
import Canteen from "@/models/Canteen";

export const dynamic = "force-dynamic";

const initialCanteens = [
  {
    canteenId: "foodcourt-34",
    id: "foodcourt-34",
    name: "Food Court near 34 Block",
    shortName: "34 Block Food Court",
    location: "34 Block · Ground Floor",
    counter: "Counter 1 (Fast Dispatch)",
    counterDetails: "Counter 1 • Express Delivery Lane",
    directions: "Near 34 Block central lawn, east wing ground entrance",
    walkingMinutes: 2,
    walkingText: "🚶 2 min walk (120m from Central Lawn)",
    distanceMeters: 120,
    rushStatus: "Less busy",
    prepMinutes: 6,
    stockCount: 24,
    isAvailable: true,
    priceOffset: 0,
    isOpen: true,
    openingHours: "Open 24/7 (Late Night Campus Hub)",
    nextOpenText: "",
    icon: "🏢",
    themeBg: "#064e3b",
    tag: "Block 34",
    description: "Ground floor near 34 block central corridor",
    pickupGuide: "Order ready hone par counter display screen par token dekhein aur collect karein."
  },
  {
    canteenId: "nk-foodcourt",
    id: "nk-foodcourt",
    name: "NK Food Court Canteen",
    shortName: "NK Food Court",
    location: "NK Block · Express Wing",
    counter: "Counter 2 (Quick Pickup)",
    counterDetails: "Counter 2 • Snacks & Quick Bite Desk",
    directions: "NK Academic Complex ground floor, opposite Auditorium Gate 2",
    walkingMinutes: 4,
    walkingText: "🚶 4 min walk (250m from Central Lawn)",
    distanceMeters: 250,
    rushStatus: "Busy",
    prepMinutes: 10,
    stockCount: 18,
    isAvailable: true,
    priceOffset: 3,
    isOpen: true,
    openingHours: "8:30 AM - 10:00 PM",
    nextOpenText: "",
    icon: "🍽️",
    themeBg: "#ea580c",
    tag: "NK Block",
    description: "NK Block grand dining square",
    pickupGuide: "Counter 2 par token flash hote hi collect karein."
  },
  {
    canteenId: "main-canteen",
    id: "main-canteen",
    name: "Main Canteen",
    shortName: "Main Canteen",
    location: "Main Block · Central Hub",
    counter: "Counter 1 (Main Express)",
    counterDetails: "Counter 1 • Hot Meals & Meal Trays",
    directions: "Central Academic Block 1st floor, above Student Activity Center",
    walkingMinutes: 1,
    walkingText: "🚶 1 min walk (60m from Main Entrance)",
    distanceMeters: 60,
    rushStatus: "Busy",
    prepMinutes: 12,
    stockCount: 20,
    isAvailable: true,
    priceOffset: -2,
    isOpen: true,
    openingHours: "8:00 AM - 10:30 PM",
    nextOpenText: "",
    icon: "🏛️",
    themeBg: "#2563eb",
    tag: "Main Block",
    description: "Central Academic Block 1st floor",
    pickupGuide: "Main hall express counter se token call hone par collect karein."
  },
  {
    canteenId: "library-cafe",
    id: "library-cafe",
    name: "Library Cafe",
    shortName: "Library Cafe",
    location: "Library Block · Ground Annex",
    counter: "Counter 2 (Quiet Corner)",
    counterDetails: "Counter 2 • Beverages & Quick Snacks",
    directions: "Library basement atrium, quiet study garden wing",
    walkingMinutes: 3,
    walkingText: "🚶 3 min walk (180m from Central Library)",
    distanceMeters: 180,
    rushStatus: "Less busy",
    prepMinutes: 5,
    stockCount: 8,
    isAvailable: true,
    priceOffset: -2,
    isOpen: false,
    openingHours: "10:00 AM - 7:00 PM",
    nextOpenText: "Opens at 10:00 AM",
    icon: "☕",
    themeBg: "#16a34a",
    tag: "Library",
    description: "Quiet garden view, Library ground annex",
    pickupGuide: "Quiet zone counter par token verify karwake collect karein."
  }
];

export async function GET() {
  try {
    await connectToDatabase();
    let canteens = await Canteen.find().sort({ createdAt: 1 });

    // Auto-seed if collection is empty
    if (!canteens || canteens.length === 0) {
      await Canteen.insertMany(initialCanteens);
      canteens = await Canteen.find().sort({ createdAt: 1 });
    }

    return Response.json(canteens, { status: 200 });
  } catch (error) {
    return Response.json(
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
      return Response.json(
        { message: "name and canteenId are required" },
        { status: 400 }
      );
    }

    const newCanteen = await Canteen.create({
      ...body,
      id: body.id || body.canteenId
    });

    return Response.json(newCanteen, { status: 201 });
  } catch (error) {
    return Response.json(
      { message: "Failed to create canteen", error: error.message },
      { status: 500 }
    );
  }
}
