export const CAMPUS_CANTEENS = [
  {
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

export const DEFAULT_CANTEEN = CAMPUS_CANTEENS[0]; // "Food Court near 34 Block"

/**
 * Dynamically fetch all active canteens from MongoDB collection via API
 */
export const fetchCanteens = async () => {
  try {
    const res = await fetch("/api/canteens");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch canteens from API, using initial dataset:", err.message);
  }
  return CAMPUS_CANTEENS;
};

/**
 * Calculates dynamic price of an item for a given canteen based on price offset.
 * Minimum price is bounded to ₹5.
 */
export const getCanteenItemPrice = (basePrice, canteen) => {
  const num = Number(basePrice) || 0;
  const offset = canteen?.priceOffset || 0;
  return Math.max(5, num + offset);
};

/**
 * Evaluates whether a canteen is currently open based on operating hours and explicit isOpen flag.
 * Supports "Open 24/7" and format like "8:30 AM - 10:00 PM".
 */
export const isCanteenOpenNow = (canteen) => {
  if (!canteen) return { isOpen: true, statusText: "Open", nextOpenText: "" };

  // Explicit hard closed flag (e.g. maintenance, quiet study hours)
  if (canteen.isOpen === false) {
    return {
      isOpen: false,
      statusText: "Closed",
      nextOpenText: canteen.nextOpenText || "Closed for the day"
    };
  }

  const hours = canteen.openingHours || "";
  if (hours.toLowerCase().includes("24/7")) {
    return {
      isOpen: true,
      statusText: "Open 24/7",
      nextOpenText: ""
    };
  }

  // Parse strings like "8:30 AM - 10:00 PM"
  const match = hours.match(/(\d+)(?::(\d+))?\s*(AM|PM)\s*-\s*(\d+)(?::(\d+))?\s*(AM|PM)/i);
  if (!match) {
    const open = canteen.isOpen !== false;
    return {
      isOpen: open,
      statusText: open ? "Open" : "Closed",
      nextOpenText: canteen.nextOpenText || ""
    };
  }

  const [, startHStr, startMStr, startPeriod, endHStr, endMStr, endPeriod] = match;
  let startH = parseInt(startHStr, 10);
  const startM = startMStr ? parseInt(startMStr, 10) : 0;
  if (startPeriod.toUpperCase() === "PM" && startH !== 12) startH += 12;
  if (startPeriod.toUpperCase() === "AM" && startH === 12) startH = 0;
  const startMinutes = startH * 60 + startM;

  let endH = parseInt(endHStr, 10);
  const endM = endMStr ? parseInt(endMStr, 10) : 0;
  if (endPeriod.toUpperCase() === "PM" && endH !== 12) endH += 12;
  if (endPeriod.toUpperCase() === "AM" && endH === 12) endH = 0;
  const endMinutes = endH * 60 + endM;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let isOpen = false;
  if (endMinutes > startMinutes) {
    isOpen = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight schedule
    isOpen = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  const formattedStart = `${startHStr}:${(startMStr || "00").padStart(2, "0")} ${startPeriod.toUpperCase()}`;
  const formattedEnd = `${endHStr}:${(endMStr || "00").padStart(2, "0")} ${endPeriod.toUpperCase()}`;

  return {
    isOpen,
    statusText: isOpen ? "Open" : "Closed",
    nextOpenText: isOpen
      ? `Closes at ${formattedEnd}`
      : `Opens at ${formattedStart}`
  };
};

