const express = require("express");
const {
  createBooking,
  getMyBookings,
  cancelBooking,
} = require("../controllers/bookingController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// every booking route needs a logged-in user
router.use(protect);

router.post("/", createBooking);
router.get("/my", getMyBookings);
router.patch("/:id/cancel", cancelBooking);

module.exports = router;