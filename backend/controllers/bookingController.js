const Booking = require("../models/Booking");
const Listing = require("../models/Listing");
const Coupon = require("../models/Coupon");
const { calculate } = require("../utils/pricing");

// POST /api/bookings  (logged-in users)
exports.createBooking = async (req, res) => {
  try {
    const { listingId, startDate, endDate, couponCode } = req.body;

    if (!listingId || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "listingId, startDate and endDate are required" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    if (!listing.available) {
      return res.status(400).json({ message: "Listing is not available" });
    }

    // Coupon is verified against the database
    let coupon = null;
    if (couponCode && couponCode.trim()) {
      const found = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        active: true,
        expiresAt: { $gt: new Date() },
      });
      if (!found) {
        return res.status(400).json({ message: "Invalid or expired coupon" });
      }
      coupon = {
        code: found.code,
        rate: found.discountPercent / 100,
        label: `${found.code} (${found.discountPercent}% off)`,
      };
    }

    // Price is always calculated on the server, never trusted from the browser
    const result = calculate({
      basePrice: listing.basePrice,
      demandTier: listing.demandTier,
      startDate,
      endDate,
      coupon,
    });

    // Double-booking check: any confirmed booking that overlaps these dates?
    const start = new Date(startDate);
    const end = new Date(endDate);
    const clash = await Booking.findOne({
      listing: listing._id,
      status: "confirmed",
      startDate: { $lt: end },
      endDate: { $gt: start },
    });
    if (clash) {
      return res
        .status(409)
        .json({ message: "This listing is already booked for those dates" });
    }

    const booking = await Booking.create({
      user: req.user._id,
      listing: listing._id,
      startDate: start,
      endDate: end,
      days: result.days,
      couponCode: coupon ? coupon.code : "",
      priceBreakdown: result,
      totalPrice: result.finalTotal,
    });

    const populated = await booking.populate(
      "listing",
      "title image location category"
    );

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/bookings/my  (logged-in users)
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("listing", "title image location category basePrice")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/bookings/:id/cancel  (owner of the booking, or admin)
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isOwner = booking.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You can only cancel your own bookings" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    if (booking.startDate <= new Date()) {
      return res
        .status(400)
        .json({ message: "Cannot cancel after the rental has started" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: "Invalid booking id" });
  }
};