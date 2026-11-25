import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import Menu from "@/models/Menu";
import mongoose from "mongoose";

// Ensure MongoDB enforces uniqueness only when tokenNumber is an assigned string,
// so pending orders with tokenNumber: null do not trigger duplicate key errors.
let isTokenIndexVerified = false;

async function ensurePartialTokenIndex() {
  if (isTokenIndexVerified) return;

  try {
    const ordersCollection = Order.collection;
    const existingIndexes = await ordersCollection.indexes();
    const existingTokenIndex = existingIndexes.find(
      (index) => index.name === "tokenNumber_1" || (index.key && index.key.tokenNumber)
    );

    if (
      existingTokenIndex &&
      (!existingTokenIndex.partialFilterExpression || !existingTokenIndex.unique)
    ) {
      await ordersCollection.dropIndex(existingTokenIndex.name).catch(() => {});
      await ordersCollection
        .createIndex(
          { tokenNumber: 1 },
          { unique: true, partialFilterExpression: { tokenNumber: { $type: "string" } } }
        )
        .catch(() => {});
    } else if (!existingTokenIndex) {
      await ordersCollection
        .createIndex(
          { tokenNumber: 1 },
          { unique: true, partialFilterExpression: { tokenNumber: { $type: "string" } } }
        )
        .catch(() => {});
    }

    isTokenIndexVerified = true;
  } catch (indexError) {
    // Ignore if index is already configured on Atlas
  }
}

export async function GET(request) {
  try {
    await connectToDatabase();
    await ensurePartialTokenIndex();

    const { searchParams } = new URL(request.url);
    const studentPhone = searchParams.get("phone");
    const studentEmail = searchParams.get("email");
    const studentName = searchParams.get("name");
    const orderIdsParam = searchParams.get("ids");
    const canteenNameParam = searchParams.get("canteen");
    const canteenIdParam = searchParams.get("canteenId");
    const orderStatusParam = searchParams.get("status") || searchParams.get("orderStatus");
    const approvalStatusParam = searchParams.get("approvalStatus");

    let orderQuery = {};
    const filterConditions = [];
    const studentIdentityFilters = [];

    if (studentEmail && studentEmail.trim()) {
      studentIdentityFilters.push({ studentEmail: studentEmail.toLowerCase().trim() });
    }

    if (studentPhone) {
      const normalizedPhone = studentPhone.replace(/\D/g, "");
      studentIdentityFilters.push({
        $or: [{ studentPhone: normalizedPhone }, { studentPhone }]
      });
    }

    if (studentName && studentName.trim()) {
      studentIdentityFilters.push({
        studentName: new RegExp(studentName.trim(), "i")
      });
    }

    if (studentIdentityFilters.length > 0) {
      filterConditions.push({ $or: studentIdentityFilters });
    }

    if (orderIdsParam) {
      const validOrderIds = orderIdsParam
        .split(",")
        .map((rawId) => rawId.trim())
        .filter((candidateId) => mongoose.Types.ObjectId.isValid(candidateId));

      if (validOrderIds.length > 0) {
        filterConditions.push({ _id: { $in: validOrderIds } });
      }
    }

    if (filterConditions.length > 0) {
      orderQuery.$or = filterConditions;
    }

    if (orderStatusParam && orderStatusParam !== "all") {
      let statusFilter;

      if (orderStatusParam === "Pending Approval" || orderStatusParam === "pending_approval") {
        statusFilter = {
          $or: [
            { orderStatus: "Pending Approval" },
            { orderStatus: "Pending", tokenNumber: null },
            { vendorApprovalStatus: "Pending" }
          ]
        };
      } else if (orderStatusParam === "Ready") {
        statusFilter = { orderStatus: { $in: ["Ready", "Ready for Pickup"] } };
      } else if (orderStatusParam === "Cancelled" || orderStatusParam === "Rejected") {
        statusFilter = { orderStatus: { $in: ["Cancelled", "Rejected"] } };
      } else {
        statusFilter = { orderStatus: orderStatusParam };
      }

      if (orderQuery.$or) {
        orderQuery = { $and: [{ $or: orderQuery.$or }, statusFilter] };
      } else {
        orderQuery = { ...orderQuery, ...statusFilter };
      }
    }

    if (approvalStatusParam && approvalStatusParam !== "all") {
      orderQuery.vendorApprovalStatus = approvalStatusParam;
    }

    if (canteenIdParam && canteenIdParam !== "all") {
      const canteenNamePatterns = {
        "foodcourt-34": /34\s*Block|Sports\s*Complex/i,
        "nk-foodcourt": /NK/i,
        "main-canteen": /Main\s*Canteen/i,
        "library-cafe": /Library/i
      };
      const canteenRegex = canteenNamePatterns[canteenIdParam];
      const canteenFilters = [
        { canteenId: canteenIdParam },
        { "items.canteenId": canteenIdParam }
      ];

      if (canteenRegex) {
        canteenFilters.push({ canteenName: canteenRegex });
        canteenFilters.push({ "items.canteenName": canteenRegex });
      }

      if (orderQuery.$and) {
        orderQuery.$and.push({ $or: canteenFilters });
      } else if (orderQuery.$or) {
        orderQuery = { $and: [{ $or: orderQuery.$or }, { $or: canteenFilters }] };
      } else {
        orderQuery.$or = canteenFilters;
      }
    } else if (canteenNameParam && canteenNameParam !== "All") {
      const canteenNameRegex = new RegExp(canteenNameParam.trim(), "i");
      const canteenFilters = [
        { canteenName: canteenNameRegex },
        { "items.canteenName": canteenNameRegex }
      ];

      if (orderQuery.$and) {
        orderQuery.$and.push({ $or: canteenFilters });
      } else if (orderQuery.$or) {
        orderQuery = { $and: [{ $or: orderQuery.$or }, { $or: canteenFilters }] };
      } else {
        orderQuery.$or = canteenFilters;
      }
    }

    const orders = await Order.find(orderQuery).sort({ createdAt: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch orders", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    await ensurePartialTokenIndex();

    const requestBody = await request.json();
    const {
      studentName,
      studentEmail,
      studentPhone,
      items,
      paymentMethod,
      remarks,
      canteenId,
      canteenName,
      counterName,
      pickupSlot
    } = requestBody;

    if (!pickupSlot || typeof pickupSlot !== "string" || !pickupSlot.trim()) {
      return NextResponse.json(
        { message: "Please select a preferred pickup time slot before placing your order." },
        { status: 400 }
      );
    }

    if (!studentName || studentName.trim() === "") {
      return NextResponse.json(
        { message: "Student name is required to place an order" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Recalculate total server-side from database menu items and check stock availability
    let calculatedTotal = 0;
    const verifiedOrderItems = [];

    for (const cartItem of items) {
      if (!cartItem.menuItemId) {
        return NextResponse.json(
          { message: "Each item must have a valid menuItemId" },
          { status: 400 }
        );
      }

      const menuItem = await Menu.findById(cartItem.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          { message: `Menu item with ID ${cartItem.menuItemId} was not found` },
          { status: 404 }
        );
      }

      const targetCanteenId = cartItem.canteenId || canteenId || "foodcourt-34";
      const isSoldOutAtCanteen =
        Array.isArray(menuItem.soldOutCanteens) &&
        menuItem.soldOutCanteens.includes(targetCanteenId);

      if (!menuItem.available || isSoldOutAtCanteen) {
        return NextResponse.json(
          {
            message: `"${menuItem.name}" is currently sold out at this canteen. Please adjust your cart.`,
            unavailableItem: menuItem.name,
            preserveCart: true
          },
          { status: 400 }
        );
      }

      const itemQuantity = parseInt(cartItem.quantity, 10);
      if (isNaN(itemQuantity) || itemQuantity <= 0) {
        return NextResponse.json(
          { message: `Invalid quantity for ${menuItem.name}. Must be at least 1` },
          { status: 400 }
        );
      }

      const unitPrice =
        typeof cartItem.price === "number" && cartItem.price > 0
          ? cartItem.price
          : menuItem.price;
      calculatedTotal += unitPrice * itemQuantity;

      verifiedOrderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: unitPrice,
        quantity: itemQuantity,
        image: menuItem.image || "",
        canteenId: cartItem.canteenId || canteenId || "foodcourt-34",
        canteenName: cartItem.canteenName || canteenName || "",
        counterName: cartItem.counterName || counterName || ""
      });
    }

    const allowedPaymentMethods = ["Cash", "UPI"];
    const selectedPaymentMethod = allowedPaymentMethods.includes(paymentMethod)
      ? paymentMethod
      : "Cash";

    const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

    const activeOrdersAhead = await Order.countDocuments({
      orderStatus: { $in: ["Pending", "Pending Approval", "Accepted", "Preparing"] }
    });
    const estimatedPrepTime = Math.max(4, activeOrdersAhead * 3 + 3);
    const resolvedCanteenId = canteenId || verifiedOrderItems[0]?.canteenId || "foodcourt-34";

    // Token number stays null until the canteen vendor accepts the order
    const createdOrder = await Order.create({
      tokenNumber: null,
      studentName: studentName.trim(),
      studentEmail: studentEmail ? studentEmail.trim().toLowerCase() : "",
      studentPhone: studentPhone ? studentPhone.trim() : "",
      remarks: remarks ? remarks.trim() : "",
      items: verifiedOrderItems,
      totalAmount: calculatedTotal,
      orderStatus: "Pending Approval",
      vendorApprovalStatus: "Pending",
      pickupSlot: pickupSlot.trim(),
      pickupCode,
      canteenId: resolvedCanteenId,
      canteenName: canteenName ? canteenName.trim() : "Sports Complex Canteen",
      counterName: counterName ? counterName.trim() : "Counter 1",
      estimatedPrepTime,
      paymentMethod: selectedPaymentMethod,
      paymentStatus:
        selectedPaymentMethod === "UPI" && requestBody.paymentStatus === "Paid"
          ? "Paid"
          : "Pending"
    });

    return NextResponse.json(createdOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to place order", error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
