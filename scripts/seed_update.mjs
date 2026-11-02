import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/fifteen_minutes_one_samosa');
  const items = [
    { name: 'Hot Samosa (with Chutney)', image: '/images/samosa.jpg', category: 'Hot Snacks', price: 15, available: true, description: 'Crispy golden crust filled with spiced potatoes & peas, served with fresh mint & tamarind chutneys.' },
    { name: 'Masala Chai', image: '/images/chai.jpg', category: 'Beverages', price: 10, available: true, description: 'Authentic college cutting chai slow-brewed with ginger, crushed cardamom & rich milk.' },
    { name: 'Crispy Veg Patty', image: '/images/patty.jpg', category: 'Hot Snacks', price: 20, available: true, description: 'Golden flaky puff pastry stuffed with savory mashed potatoes, cumin & tender green peas.' },
    { name: 'Paneer Roll', image: '/images/roll.jpg', category: 'Meals & Wraps', price: 40, available: true, description: 'Grilled spiced paneer cubes wrapped with crunchy onions & tangy mint chutney in a fresh paratha.' },
    { name: 'Cheese Maggi', image: '/images/maggi.jpg', category: 'Meals & Wraps', price: 35, available: true, description: 'Steaming bowl of 2-minute masala Maggi loaded with vegetables and melted cheese.' },
    { name: 'Cold Coffee', image: '/images/coffee.jpg', category: 'Beverages', price: 30, available: true, description: 'Chilled thick blended coffee topped with chocolate syrup swirl and creamy froth.' },
    { name: 'Veg Cheese Sandwich', image: '/images/sandwich.jpg', category: 'Meals & Wraps', price: 45, available: true, description: 'Freshly grilled triangular sandwich stuffed with cheese, cucumber, tomato & coriander pesto.' }
  ];

  for (const it of items) {
    await mongoose.connection.collection('menus').updateOne(
      { name: it.name },
      { $set: it },
      { upsert: true }
    );
  }

  console.log('Successfully updated all menu items in MongoDB with distinct images & categories');
  await mongoose.disconnect();
}

run().catch(console.error);
