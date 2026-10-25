const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    days: {
      type: Number,
      required: true,
      min: 1,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
      max: 20,
    },
    couponCode: {
      type: String,
      default: "",
    },
    priceBreakdown: {
      type: Object,
      default: {},
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    fullName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    payment: {
      type: Object,
      default: {},
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);