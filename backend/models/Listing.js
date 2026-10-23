const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    legacyId: {
      type: String,
      unique: true,
      sparse: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      lowercase: true,
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [1, "Price must be at least 1"],
    },
    demandTier: {
      type: String,
      default: "medium",
    },
    badge: {
      type: String,
      default: "",
    },
    gradient: {
      type: String,
      default: "",
    },
    shortDescription: {
      type: String,
      default: "",
    },
    features: {
      type: [String],
      default: [],
    },
    specifications: {
      type: Object,
      default: {},
    },
    policies: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      default: "",
    },
    available: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Listing", listingSchema);