const Listing = require("../models/Listing");
const Coupon = require("../models/Coupon");
const { calculate } = require("../utils/pricing");

// POST /api/pricing/quote
exports.getQuote = async (req, res) => {
  try {
        const { listingId, startDate, endDate, couponCode } = req.body || {};

    if (!listingId || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "listingId, startDate and endDate are required" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Coupon is checked against the database
    let coupon = null;
    let couponValid = null; // null = none entered
    if (couponCode && couponCode.trim()) {
      const found = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        active: true,
        expiresAt: { $gt: new Date() },
      });
      if (found) {
        coupon = {
          code: found.code,
          rate: found.discountPercent / 100,
          label: `${found.code} (${found.discountPercent}% off)`,
        };
        couponValid = true;
      } else {
        couponValid = false;
      }
    }

    const result = calculate({
      basePrice: listing.basePrice,
      demandTier: listing.demandTier,
      startDate,
      endDate,
      coupon,
    });

    res.json({
      listing: {
        _id: listing._id,
        title: listing.title,
        basePrice: listing.basePrice,
        demandTier: listing.demandTier,
      },
      ...result,
      couponValid,
      couponApplied: coupon,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};