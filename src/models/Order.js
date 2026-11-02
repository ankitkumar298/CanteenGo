import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Menu"
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: {
    type: String,
    default: ""
  },
  canteenId: {
    type: String,
    default: "foodcourt-34"
  },
  canteenName: {
    type: String,
    default: ""
  },
  counterName: {
    type: String,
    default: ""
  }
});

const orderSchema = new mongoose.Schema({
  tokenNumber: {
    type: String,
    required: true,
    unique: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  studentEmail: {
    type: String,
    trim: true,
    default: ""
  },
  studentPhone: {
    type: String,
    trim: true,
    default: ""
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  orderStatus: {
    type: String,
    enum: ["Pending", "Preparing", "Ready", "Completed", "Missed Pickup", "Cancelled"],
    default: "Pending"
  },
  pickupCode: {
    type: String,
    required: true
  },
  missedAt: {
    type: Date,
    default: null
  },
  rescheduleCount: {
    type: Number,
    default: 0
  },
  canteenId: {
    type: String,
    default: "foodcourt-34"
  },
  canteenName: {
    type: String,
    default: "Main Campus Cafeteria (Block B)"
  },
  counterName: {
    type: String,
    default: "Counter 1 (Express Delivery)"
  },
  remarks: {
    type: String,
    trim: true,
    default: ""
  },
  estimatedPrepTime: {
    type: Number,
    default: 7
  },
  delayMinutes: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ["Cash", "UPI"],
    default: "Cash"
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid"],
    default: "Pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

if (mongoose.models && mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.model("Order", orderSchema);
