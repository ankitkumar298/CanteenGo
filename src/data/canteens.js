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
 * Returns exact price set for an item at a specific canteen.
 * If vendor/canteen has set a custom price in canteenPrices, returns that exact price.
 * Otherwise returns the item's standard price.
 */
export const getItemPriceForCanteen = (item, canteen) => {
  if (!item) return 0;
  const canteenId = typeof canteen === "string" ? canteen : canteen?.id || canteen?.canteenId;

  // Exact price set by this canteen vendor
  if (canteenId && item.canteenPrices && item.canteenPrices[canteenId] !== undefined && item.canteenPrices[canteenId] !== null) {
    const cp = Number(item.canteenPrices[canteenId]);
    if (!isNaN(cp) && cp >= 0) return cp;
  }

  // Standard item price
  const p = Number(item.price !== undefined ? item.price : item.basePrice || 0);
  return Math.max(5, p);
};

/**
 * Checks if an item is available at a specific canteen.
 * If this specific canteen marked the item as Sold Out, returns false.
 * Other canteens remain available.
 */
export const isItemAvailableAtCanteen = (item, canteen) => {
  if (!item) return false;
  const canteenId = typeof canteen === "string" ? canteen : canteen?.id || canteen?.canteenId;

  // Check if specifically marked sold out at this canteen
  if (canteenId && Array.isArray(item.soldOutCanteens) && item.soldOutCanteens.includes(canteenId)) {
    return false;
  }

  // Check if item is restricted to specific canteens
  if (
    canteenId &&
    canteenId !== "all" &&
    Array.isArray(item.availableCanteens) &&
    item.availableCanteens.length > 0 &&
    !item.availableCanteens.includes("all")
  ) {
    if (!item.availableCanteens.includes(canteenId)) {
      return false;
    }
  }

  // Check document-level availability
  return item.available !== false;
};

/**
 * Calculates dynamic price of an item for a given canteen.
 * Accepts either a food item object or a numeric basePrice.
 */
export const getCanteenItemPrice = (itemOrBasePrice, canteen) => {
  if (itemOrBasePrice && typeof itemOrBasePrice === "object") {
    return getItemPriceForCanteen(itemOrBasePrice, canteen);
  }
  const num = Number(itemOrBasePrice) || 0;
  return Math.max(5, num);
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

/**
 * Calculates estimated preparation/wait time for a particular item.
 * Supports dynamic canteen selection and live kitchen stats so times in Menu, Cart and Modal stay synchronized.
 */
export const getItemEstimateTime = (item, canteen = null, liveStatsMap = null) => {
  if (!item) return "~5 min";

  // In case liveStatsMap was passed as the 2nd argument
  if (canteen && !canteen.id && !canteen.name && !canteen.waitMinutes && !canteen.prepMinutes && typeof canteen === "object") {
    liveStatsMap = canteen;
    canteen = null;
  }

  // Resolve target canteen: passed parameter OR item.canteen
  const targetCanteen = (canteen && canteen.id !== "all" && canteen.name !== "All Canteens") ? canteen : item.canteen;
  const cName = targetCanteen?.name;

  // Get canteen base wait time from liveStatsMap or canteen prepMinutes
  let canteenWait = null;
  if (liveStatsMap && cName) {
    if (liveStatsMap[cName] && typeof liveStatsMap[cName].waitMinutes === "number") {
      canteenWait = liveStatsMap[cName].waitMinutes;
    } else {
      const cleanName = cName.toLowerCase().replace(/canteen|food court/gi, "").trim();
      const matchedKey = Object.keys(liveStatsMap).find((k) => {
        const cleanK = k.toLowerCase().replace(/canteen|food court/gi, "").trim();
        return cleanK && (cleanK.includes(cleanName) || cleanName.includes(cleanK));
      });
      if (matchedKey && typeof liveStatsMap[matchedKey].waitMinutes === "number") {
        canteenWait = liveStatsMap[matchedKey].waitMinutes;
      }
    }
  }

  if (canteenWait === null) {
    if (typeof targetCanteen?.waitMinutes === "number") {
      canteenWait = targetCanteen.waitMinutes;
    } else if (typeof targetCanteen?.prepMinutes === "number") {
      canteenWait = targetCanteen.prepMinutes;
    }
  }

  const name = (item.name || "").toLowerCase();
  const category = (item.category || "").toLowerCase();

  // If a specific canteen is selected:
  if (canteenWait !== null) {
    // Quick items (beverages & pre-made hot snacks) take ~60% of canteen queue time (min 2-3 min)
    if (name.includes("chai") || name.includes("tea") || name.includes("coffee") || name.includes("samosa") || name.includes("patty") || category.includes("beverage")) {
      return `~${Math.max(2, Math.round(canteenWait * 0.6))} min`;
    }
    // Made-to-order hot meals (Maggi, Roll, Sandwich, Burger) take full canteen wait time
    return `~${canteenWait} min`;
  }

  // If on "All Canteens" or no canteen specified, show typical preparation time
  let minutes = 5;
  if (name.includes("chai") || name.includes("tea")) minutes = 3;
  else if (name.includes("coffee") || name.includes("shake")) minutes = 4;
  else if (name.includes("samosa") || name.includes("patty") || name.includes("kachori")) minutes = 3;
  else if (name.includes("maggi") || name.includes("noodle")) minutes = 6;
  else if (name.includes("roll") || name.includes("wrap")) minutes = 8;
  else if (name.includes("sandwich") || name.includes("burger")) minutes = 7;
  else if (name.includes("pizza") || name.includes("thali") || name.includes("meal")) minutes = 10;
  else if (category.includes("beverage")) minutes = 3;
  else if (category.includes("snack")) minutes = 4;
  else if (category.includes("wrap") || category.includes("meal")) minutes = 8;

  return `~${minutes} min`;
};

