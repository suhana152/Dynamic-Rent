const mongoose = require("mongoose");
require("dotenv").config();

const Coupon = require("./models/Coupon");

const coupons = [
  { code: "WELCOME10", discountPercent: 10 },
  { code: "SAVE20", discountPercent: 20 },
  { code: "FIRSTRENT", discountPercent: 15 },
].map((c) => ({ ...c, expiresAt: new Date("2030-12-31"), active: true }));

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Coupon.deleteMany({});
    const inserted = await Coupon.insertMany(coupons);
    console.log(`Seeded ${inserted.length} coupons`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seed();