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
    basePrice: {
      type: Number,
      min: 0
    },
    available: {
      type: Boolean,
      default: true
    },
    foodType: {
      type: String,
      enum: ["veg", "non-veg", "egg"],
      default: "veg"
    },
    isVeg: {
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
    rating: {
      type: Number,
      default: 4.5,
      min: 1,
      max: 5
    },
    ratingCount: {
      type: Number,
      default: 12
    },
    ratings: [
      {
        orderId: { type: String, default: "" },
        studentEmail: { type: String, default: "" },
        studentName: { type: String, default: "" },
        stars: { type: Number, required: true, min: 1, max: 5 },
        createdAt: { type: Date, default: Date.now }
      }
    ],
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
    },
    canteenPrices: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    soldOutCanteens: {
      type: [String],
      default: []
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
