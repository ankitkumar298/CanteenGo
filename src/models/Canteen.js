import mongoose from "mongoose";

const canteenSchema = new mongoose.Schema(
  {
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    shortName: {
      type: String,
      default: "",
      trim: true
    },
    location: {
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
    }
  },
  {
    timestamps: true
  }
);

if (mongoose.models && mongoose.models.Canteen) {
  delete mongoose.models.Canteen;
}

export default mongoose.model("Canteen", canteenSchema);
