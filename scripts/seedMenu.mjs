import mongoose from "mongoose";

const ATLAS_URI = process.env.MONGODB_URI || "mongodb+srv://ankitkumar202800_db_user:Ankit2006_atlas@cluster0.xct3hpo.mongodb.net/canteenGo?retryWrites=true&w=majority";

const items = [
  {
    name: "Hot Samosa (with Chutney)",
    price: 15,
    available: true,
    image: "/images/samosa.jpg",
    category: "Hot Snacks",
    description: "Crispy golden crust filled with spiced potatoes & peas, served with fresh mint & tamarind chutneys.",
    canteenId: "all",
    canteenName: "All Canteens",
    availableCanteens: ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"]
  },
  {
    name: "Masala Chai",
    price: 10,
    available: true,
    image: "/images/chai.jpg",
    category: "Beverages",
    description: "Authentic college cutting chai slow-brewed with ginger, crushed cardamom & rich milk.",
    canteenId: "all",
    canteenName: "All Canteens",
    availableCanteens: ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"]
  },
  {
    name: "Crispy Veg Patty",
    price: 20,
    available: true,
    image: "/images/patty.jpg",
    category: "Hot Snacks",
    description: "Golden flaky puff pastry stuffed with savory mashed potatoes, cumin & tender green peas.",
    canteenId: "all",
    canteenName: "All Canteens",
    availableCanteens: ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"]
  },
  {
    name: "Paneer Roll",
    price: 40,
    available: true,
    image: "/images/roll.jpg",
    category: "Meals & Wraps",
    description: "Grilled spiced paneer cubes wrapped with crunchy onions & tangy mint chutney in a fresh paratha.",
    canteenId: "all",
    canteenName: "All Canteens",
    availableCanteens: ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"]
  },
  {
    name: "Cheese Maggi",
    price: 35,
    available: true,
    image: "/images/maggi.jpg",
    category: "Meals & Wraps",
    description: "Steaming bowl of 2-minute masala Maggi loaded with vegetables and melted cheese.",
    canteenId: "all",
    canteenName: "All Canteens",
    availableCanteens: ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"]
  },
  {
    name: "Cold Coffee",
    price: 30,
    available: true,
    image: "/images/coffee.jpg",
    category: "Beverages",
    description: "Chilled thick blended coffee topped with chocolate syrup swirl and creamy froth.",
    canteenId: "all",
    canteenName: "All Canteens",
    availableCanteens: ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"]
  },
  {
    name: "Veg Cheese Sandwich",
    price: 45,
    available: true,
    image: "/images/sandwich.jpg",
    category: "Meals & Wraps",
    description: "Freshly grilled triangular sandwich stuffed with cheese, cucumber, tomato & coriander pesto.",
    canteenId: "all",
    canteenName: "All Canteens",
    availableCanteens: ["foodcourt-34", "nk-foodcourt", "main-canteen", "library-cafe"]
  }
];

async function seed() {
  await mongoose.connect(ATLAS_URI);
  const coll = mongoose.connection.collection("menus");
  for (const item of items) {
    await coll.updateOne(
      { name: item.name },
      { $set: item },
      { upsert: true }
    );
  }
  const count = await coll.countDocuments();
  console.log(`✅ Atlas menus verified with all 7 items, total count: ${count}`);
  await mongoose.disconnect();
}

seed().catch(console.error);
