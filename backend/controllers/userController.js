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

// PUT /api/users/me  (logged-in users): change name and phone
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body || {};
    const update = {};

    if (name !== undefined) {
      if (String(name).trim().length < 2) {
        return res
          .status(400)
          .json({ message: "Name must be at least 2 characters" });
      }
      update.name = String(name).trim();
    }
    if (phone !== undefined) {
      update.phone = String(phone).trim();
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    });

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};