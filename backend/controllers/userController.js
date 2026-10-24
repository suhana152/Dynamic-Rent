const User = require("../models/User");

// POST /api/users/avatar  (logged-in users)
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please choose an image file" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: `/uploads/${req.file.filename}` },
      { new: true }
    );

    res.json({
      message: "Avatar updated",
      avatar: user.avatar,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};