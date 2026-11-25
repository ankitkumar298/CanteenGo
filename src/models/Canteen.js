import mongoose from "mongoose";

// Field order here defines column order in MongoDB Compass Table View:
// name -> location -> isApprove -> slot -> managerNumber -> ...
const canteenSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      default: "",
      trim: true
    },
    isApprove: {
      type: Number,
      enum: [0, 1],
      default: 0
    },
    slot: {
      type: String,
      default: "9:00 AM - 9:00 PM",
      trim: true
    },
    managerNumber: {
      type: String,
      default: "",
      trim: true
    },
    ownerName: {
      type: String,
      default: "",
      trim: true
    },
    ownerPhone: {
      type: String,
      default: "",
      trim: true
    },
    canteenId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    id: {
      type: String,
      required: true,
      trim: true
    },
    shortName: {
      type: String,
      default: "",
      trim: true
    },
    counter: {
      type: String,
      default: "",
      trim: true
    },
    counterDetails: {
      type: String,
      default: "",
      trim: true
    },
    directions: {
      type: String,
      default: "",
      trim: true
    },
    walkingMinutes: {
      type: Number,
      default: 2
    },
    walkingText: {
      type: String,
      default: ""
    },
    distanceMeters: {
      type: Number,
      default: 100
    },
    rushStatus: {
      type: String,
      default: "Less busy"
    },
    prepMinutes: {
      type: Number,
      default: 6
    },
    stockCount: {
      type: Number,
      default: 20
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    priceOffset: {
      type: Number,
      default: 0
    },
    isOpen: {
      type: Boolean,
      default: true
    },
    openingHours: {
      type: String,
      default: "Open 24/7 (Late Night Campus Hub)"
    },
    nextOpenText: {
      type: String,
      default: ""
    },
    icon: {
      type: String,
      default: "🏢"
    },
    themeBg: {
      type: String,
      default: "#ea580c"
    },
    tag: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    pickupGuide: {
      type: String,
      default: ""
    },
    staffPin: {
      type: String,
      default: "1234",
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Canteen || mongoose.model("Canteen", canteenSchema);
