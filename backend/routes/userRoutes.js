const express = require("express");
const upload = require("../middleware/upload");
const { uploadAvatar } = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// protect runs first so req.user exists for the filename
router.post(
  "/avatar",
  protect,
  (req, res, next) => {
    upload.single("avatar")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  uploadAvatar
);

module.exports = router;