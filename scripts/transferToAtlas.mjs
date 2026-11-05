import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/fifteen_minutes_one_samosa';
const ATLAS_URI = process.argv[2] || process.env.ATLAS_MONGODB_URI;

if (!ATLAS_URI) {
  console.error("❌ Please provide the MongoDB Atlas connection string as an argument:");
  console.error("   node scripts/transferToAtlas.mjs \"mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/canteenGo?retryWrites=true&w=majority\"");
  process.exit(1);
}

async function transfer() {
  console.log("⏳ Connecting to local MongoDB...");
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log(`✅ Connected to local MongoDB: ${localConn.name}`);

  console.log("⏳ Connecting to MongoDB Atlas...");
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log(`✅ Connected to MongoDB Atlas: ${atlasConn.name}`);

  const collections = ['menus', 'students', 'orders'];
  const summary = {};

  for (const collName of collections) {
    const localColl = localConn.collection(collName);
    const atlasColl = atlasConn.collection(collName);

    const docs = await localColl.find({}).toArray();
    console.log(`📦 Found ${docs.length} documents in local collection '${collName}'`);

    if (docs.length > 0) {
      // Clear existing in Atlas collection to avoid duplicates
      await atlasColl.deleteMany({});
      const res = await atlasColl.insertMany(docs);
      console.log(`🚀 Transferred ${res.insertedCount} documents to Atlas collection '${collName}'`);
      summary[collName] = res.insertedCount;
    } else {
      summary[collName] = 0;
    }
  }

  // Check and drop placeholder 'canteenGo' collection if empty
  try {
    const collectionsInAtlas = await atlasConn.db.listCollections().toArray();
    if (collectionsInAtlas.some(c => c.name === 'canteenGo')) {
      const count = await atlasConn.collection('canteenGo').countDocuments();
      if (count === 0) {
        await atlasConn.collection('canteenGo').drop();
        console.log("🧹 Cleaned up empty placeholder collection 'canteenGo' from Atlas");
      }
    }
  } catch (e) {
    // ignore
  }

  // Update .env.local with Atlas URI
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    fs.writeFileSync(envPath, `MONGODB_URI=${ATLAS_URI.trim()}\n`);
    console.log("📝 Updated .env.local with the MongoDB Atlas URI!");
  } catch (e) {
    console.warn("Could not auto-update .env.local:", e.message);
  }

  console.log("\n🎉 ALL DATA TRANSFERRED SUCCESSFULLY TO MONGODB ATLAS!");
  console.log("Summary:", summary);

  await localConn.close();
  await atlasConn.close();
}

transfer().catch(err => {
  console.error("❌ Transfer failed:", err.message);
  process.exit(1);
});

