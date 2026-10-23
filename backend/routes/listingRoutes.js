const express = require("express");
const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
} = require("../controllers/listingController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.route("/").get(getListings).post(protect, adminOnly, createListing);

router
  .route("/:id")
  .get(getListing)
  .put(protect, adminOnly, updateListing)
  .delete(protect, adminOnly, deleteListing);

module.exports = router;