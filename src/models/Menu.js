import mongoose from "mongoose";

const menuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    available: {
      type: Boolean,
      default: true
    },
    image: {
      type: String,
      default: "/images/samosa.jpg"
    },
    category: {
      type: String,
      default: "Snacks",
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    canteenId: {
      type: String,
      default: "all",
      trim: true
    },
    canteenName: {
      type: String,
      default: "All Canteens",
      trim: true
    },
    availableCanteens: {
      type: [String],
      default: ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"]
    }
  },
  {
    timestamps: true
  }
);

if (mongoose.models && mongoose.models.Menu) {
  delete mongoose.models.Menu;
}

export default mongoose.model("Menu", menuSchema);
