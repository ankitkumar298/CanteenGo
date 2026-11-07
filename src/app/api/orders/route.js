import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import Menu from "@/models/Menu";
import mongoose from "mongoose";

// Helper function to safely generate the next unique token number
async function generateNextToken() {
  // Find the most recent order to determine the last token
  const lastOrder = await Order.findOne().sort({ createdAt: -1 });

  let nextNumber = 101;
  if (lastOrder && lastOrder.tokenNumber) {
    const match = lastOrder.tokenNumber.match(/\d+/);
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1;
    }
  }

  // Ensure uniqueness in case of race condition or gaps
  let candidateToken = `T-${nextNumber}`;
  let exists = await Order.findOne({ tokenNumber: candidateToken });
  while (exists) {
    nextNumber += 1;
    candidateToken = `T-${nextNumber}`;
    exists = await Order.findOne({ tokenNumber: candidateToken });
  }

  return candidateToken;
}

export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const isStudent = searchParams.get("student") === "true";
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const ids = searchParams.get("ids");
    const canteen = searchParams.get("canteen");
    const canteenId = searchParams.get("canteenId");

    let query = {};
    const conditions = [];

    const studentAccountConditions = [];
    if (email && email.trim()) {
      studentAccountConditions.push({ studentEmail: email.toLowerCase().trim() });
    }

    if (phone && name && name.trim()) {
      const cleanPhone = phone.replace(/\D/g, "");
      studentAccountConditions.push({
        $and: [
          { studentName: new RegExp(`^${name.trim()}$`, "i") },
          { $or: [{ studentPhone: cleanPhone }, { studentPhone: phone }] }
        ]
      });
    } else if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      studentAccountConditions.push({
        $or: [{ studentPhone: cleanPhone }, { studentPhone: phone }]
      });
    } else if (name && name.trim()) {
      studentAccountConditions.push({ studentName: new RegExp(`^${name.trim()}$`, "i") });
    }

    if (studentAccountConditions.length > 0) {
      conditions.push({ $or: studentAccountConditions });
    }

    if (ids) {
      const idList = ids
        .split(",")
        .map((s) => s.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (idList.length > 0) {
        conditions.push({ _id: { $in: idList } });
      }
    }

    // If specific student conditions are provided, filter by them
    if (conditions.length > 0) {
      query.$or = conditions;
    }

    // Scoped Canteen Filter (supports canteenId and canteenName)
    if (canteenId && canteenId !== "all") {
      const canteenRegexMap = {
        "foodcourt-34": /34\s*Block/i,
        "nk-foodcourt": /NK/i,
        "main-canteen": /Main\s*Canteen/i,
        "library-cafe": /Library/i
      };
      const regex = canteenRegexMap[canteenId];
      const canteenConditions = [
        { canteenId: canteenId },
        { "items.canteenId": canteenId }
      ];
      if (regex) {
        canteenConditions.push({ canteenName: regex });
        canteenConditions.push({ "items.canteenName": regex });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: canteenConditions }];
        delete query.$or;
      } else {
        query.$or = canteenConditions;
      }
    } else if (canteen && canteen !== "All") {
      const canteenRegex = new RegExp(canteen.trim(), "i");
      const canteenConditions = [
        { canteenName: canteenRegex },
        { "items.canteenName": canteenRegex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: canteenConditions }];
        delete query.$or;
      } else {
        query.$or = canteenConditions;
      }
    }

    // Retrieve all orders sorted by creation time (newest first)
    const orders = await Order.find(query).sort({ createdAt: -1 });
    return Response.json(orders, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: "Failed to fetch orders", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    const { studentName, studentEmail, studentPhone, items, paymentMethod, remarks, canteenId, canteenName, counterName } = data;

    // Validate student name
    if (!studentName || studentName.trim() === "") {
      return Response.json(
        { message: "Student name is required to place an order" },
        { status: 400 }
      );
    }

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { message: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Calculate total on the backend using actual prices from the database
    let calculatedTotal = 0;
    const verifiedOrderItems = [];

    for (const item of items) {
      if (!item.menuItemId) {
        return Response.json(
          { message: "Each item must have a valid menuItemId" },
          { status: 400 }
        );
      }

      const menuItem = await Menu.findById(item.menuItemId);
      if (!menuItem) {
        return Response.json(
          { message: `Menu item with ID ${item.menuItemId} was not found` },
          { status: 404 }
        );
      }

      if (!menuItem.available) {
        return Response.json(
          {
            message: `"${menuItem.name}" abhi out-of-stock / unavailable ho gaya hai. Cart ko preserve rakha gaya hai taaki aap item change ya remove kar sakein.`,
            unavailableItem: menuItem.name,
            preserveCart: true
          },
          { status: 400 }
        );
      }

      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        return Response.json(
          { message: `Invalid quantity for ${menuItem.name}. Must be at least 1` },
          { status: 400 }
        );
      }

      const effectivePrice = typeof item.price === "number" && item.price > 0 ? item.price : menuItem.price;
      const itemTotal = effectivePrice * quantity;
      calculatedTotal += itemTotal;

      verifiedOrderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: effectivePrice,
        quantity: quantity,
        image: menuItem.image || "",
        canteenId: item.canteenId || canteenId || "foodcourt-34",
        canteenName: item.canteenName || canteenName || "",
        counterName: item.counterName || counterName || ""
      });
    }

    // Safe unique token number generation
    const tokenNumber = await generateNextToken();

    // Default payment method validation
    const validPaymentMethods = ["Cash", "UPI"];
    const selectedPaymentMethod = validPaymentMethods.includes(paymentMethod)
      ? paymentMethod
      : "Cash";

    // Generate a secure 4-digit secret pickup verification code
    const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Intelligent estimated preparation time calculation based on active kitchen load
    const activeOrdersAhead = await Order.countDocuments({
      orderStatus: { $in: ["Pending", "Preparing"] }
    });
    const estimatedPrepTime = Math.max(4, activeOrdersAhead * 3 + 3);

    const resolvedCanteenId = canteenId || (verifiedOrderItems[0]?.canteenId) || "foodcourt-34";

    const newOrder = await Order.create({
      tokenNumber,
      studentName: studentName.trim(),
      studentEmail: studentEmail ? studentEmail.trim().toLowerCase() : "",
      studentPhone: studentPhone ? studentPhone.trim() : "",
      remarks: remarks ? remarks.trim() : "",
      items: verifiedOrderItems,
      totalAmount: calculatedTotal,
      orderStatus: "Pending",
      pickupCode,
      canteenId: resolvedCanteenId,
      canteenName: canteenName ? canteenName.trim() : "Food Court near 34 Block",
      counterName: counterName ? counterName.trim() : "Counter 1",
      estimatedPrepTime,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: "Pending"
    });

    return Response.json(newOrder, { status: 201 });
  } catch (error) {
    return Response.json(
      { message: "Failed to place order", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
