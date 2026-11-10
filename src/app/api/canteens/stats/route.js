import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import Canteen from "@/models/Canteen";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    // Dynamically retrieve all registered canteens from MongoDB collection
    const canteenDocs = await Canteen.find().sort({ createdAt: 1 });
    const canteens = canteenDocs.map((c) => c.name);

    // Aggregate active orders grouped by canteen
    const activeOrders = await Order.aggregate([
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

    const statsMap = {};
    activeOrders.forEach((group) => {
      if (group._id) {
        statsMap[group._id] = {
          ordersAhead: group.ordersAhead,
          preparingCount: group.preparingCount
        };
      }
    });

    const result = canteens.map((name) => {
      const stats = statsMap[name] || { ordersAhead: 0, preparingCount: 0 };
      const ordersAhead = stats.ordersAhead;
      const preparingCount = stats.preparingCount;

      // Realistic kitchen wait time calculation:
      // base cooking (3 min) + 2.5 min per order ahead
      const waitMinutes = Math.max(3, Math.round(ordersAhead * 2.5 + 3));

      let rushStatus = "Less busy";
      if (ordersAhead > 5) rushStatus = "Busy";
      else if (ordersAhead >= 3) rushStatus = "Moderate";

      return {
        canteenName: name,
        ordersAhead,
        preparingCount,
        waitMinutes,
        rushStatus
      };
    });

    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: "Failed to fetch canteen stats", error: error.message },
      { status: 500 }
    );
  }
}

