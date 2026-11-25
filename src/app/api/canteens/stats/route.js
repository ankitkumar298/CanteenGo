import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import Canteen from "@/models/Canteen";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const canteenDocs = await Canteen.find().sort({ createdAt: 1 });
    const canteenNames = canteenDocs.map((canteenDoc) => canteenDoc.name);

    const activeOrderGroups = await Order.aggregate([
      {
        $match: {
          orderStatus: { $in: ["Pending", "Preparing"] }
        }
      },
      {
        $group: {
          _id: "$canteenName",
          ordersAhead: { $sum: 1 },
          preparingCount: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "Preparing"] }, 1, 0] }
          }
        }
      }
    ]);

    const statsByCanteenName = {};
    activeOrderGroups.forEach((orderGroup) => {
      if (orderGroup._id) {
        statsByCanteenName[orderGroup._id] = {
          ordersAhead: orderGroup.ordersAhead,
          preparingCount: orderGroup.preparingCount
        };
      }
    });

    const canteenStatsList = canteenNames.map((canteenName) => {
      const currentStats = statsByCanteenName[canteenName] || {
        ordersAhead: 0,
        preparingCount: 0
      };
      const { ordersAhead, preparingCount } = currentStats;

      // Base cooking time (3 min) + ~2.5 min per order ahead in queue
      const waitMinutes = Math.max(3, Math.round(ordersAhead * 2.5 + 3));

      let rushStatus = "Less busy";
      if (ordersAhead > 5) rushStatus = "Busy";
      else if (ordersAhead >= 3) rushStatus = "Moderate";

      return {
        canteenName,
        ordersAhead,
        preparingCount,
        waitMinutes,
        rushStatus
      };
    });

    return NextResponse.json(canteenStatsList, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch canteen stats", error: error.message },
      { status: 500 }
    );
  }
}

