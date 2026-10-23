const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const Listing = require("./models/Listing");

const dataPath = path.join(
  __dirname,
  "..",
  "DynamicRent",
  "data",
  "listings.json"
);

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    // Phase 1 "id" becomes "legacyId" (MongoDB makes its own _id)
    const docs = raw.map(({ id, ...rest }) => ({ legacyId: id, ...rest }));

    await Listing.deleteMany({});
    const inserted = await Listing.insertMany(docs);

    console.log(`Seeded ${inserted.length} listings`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seed();