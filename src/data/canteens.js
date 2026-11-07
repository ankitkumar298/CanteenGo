export const CAMPUS_CANTEENS = [
  {
    id: "foodcourt-34",
    name: "Food Court near 34 Block",
    shortName: "34 Block Food Court",
    location: "Main Block · Central Hub",
    counter: "Counter 1 (Fast Dispatch)",
    counterDetails: "Counter 1 • Express Delivery Lane",
    directions: "Central Academic Block 1st floor, above Student Activity Center",
    walkingMinutes: 1,
    walkingText: "🚶 1 min walk (60 m)",
    distanceMeters: 60,
    rushStatus: "Less busy",
    prepMinutes: 6,
    stockCount: 24,
    isAvailable: true,
    priceOffset: -3,
    isOpen: true,
    openingHours: "8:00 AM – 10:30 PM",
    nextOpenText: "",
    icon: "🏢",
    themeBg: "#064e3b",
    tag: "Block 34",
    description: "Main Block central hub ground floor",
    pickupGuide: "Order ready hone par counter display screen par token dekhein aur collect karein."
  },
  {
    id: "main-canteen",
    name: "Main Canteen",
    shortName: "Main Canteen",
    location: "Block 32 · Academic Wing",
    counter: "Counter 1 (Main Express)",
    counterDetails: "Counter 1 • Hot Meals & Meal Trays",
    directions: "Block 32 ground entrance, central dining hall",
    walkingMinutes: 3,
    walkingText: "🚶 3 min walk (180 m)",
    distanceMeters: 180,
    rushStatus: "Busy",
    prepMinutes: 8,
    stockCount: 20,
    isAvailable: true,
    priceOffset: 0,
    isOpen: true,
    openingHours: "8:00 AM – 9:00 PM",
    nextOpenText: "",
    icon: "🏛️",
    themeBg: "#2563eb",
    tag: "Main Canteen",
    description: "Block 32 Academic Wing dining hall",
    pickupGuide: "Main hall express counter se token call hone par collect karein."
  },
  {
    id: "nk-foodcourt",
    name: "Student Activity Center Canteen",
    shortName: "SAC Canteen",
    location: "SAC · Near Auditorium",
    counter: "Counter 2 (Quick Pickup)",
    counterDetails: "Counter 2 • Snacks & Quick Bite Desk",
    directions: "SAC ground complex, opposite Auditorium Gate 2",
    walkingMinutes: 4,
    walkingText: "🚶 4 min walk (260 m)",
    distanceMeters: 260,
    rushStatus: "Moderate",
    prepMinutes: 10,
    stockCount: 18,
    isAvailable: true,
    priceOffset: -2,
    isOpen: true,
    openingHours: "8:00 AM – 9:30 PM",
    nextOpenText: "",
    icon: "🍽️",
    themeBg: "#ea580c",
    tag: "SAC Canteen",
    description: "SAC central dining court",
    pickupGuide: "Counter 2 par token flash hote hi collect karein."
  },
  {
    id: "library-cafe",
    name: "Sports Complex Canteen",
    shortName: "Sports Complex",
    location: "Sports Block · Ground Floor",
    counter: "Counter 2 (Quiet Corner)",
    counterDetails: "Counter 2 • Sports Cafe Counter",
    directions: "Sports Block ground floor atrium",
    walkingMinutes: 5,
    walkingText: "🚶 5 min walk (350 m)",
    distanceMeters: 350,
    rushStatus: "Less busy",
    prepMinutes: 12,
    stockCount: 8,
    isAvailable: true,
    priceOffset: 0,
    isOpen: false,
    openingHours: "Opens at 12:00 PM",
    nextOpenText: "Opens at 12:00 PM",
    icon: "☕",
    themeBg: "#16a34a",
    tag: "Sports Complex",
    description: "Sports complex ground annex",
    pickupGuide: "Counter par token verify karwake collect karein."
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

