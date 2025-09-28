// controllers/pinController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail"); // already in your project

// Create PIN
exports.createPin = async (req, res) => {
  try {
    const { newPin } = req.body;
    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.transactionPin) {
      return res.status(400).json({ message: "PIN already set" });
    }

    const salt = await bcrypt.genSalt(10);
    user.transactionPin = await bcrypt.hash(newPin, salt);
    await user.save();

    res.json({ message: "PIN created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Verify PIN
exports.verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.transactionPin) {
      return res.status(400).json({ message: "No PIN set" });
    }

    const isMatch = await user.matchPin(pin);
    if (!isMatch) return res.status(400).json({ message: "Invalid PIN" });

    res.json({ message: "PIN verified" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot PIN (send reset email)
exports.forgotPin = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await sendEmail(user.email, "PIN Reset Request", "Click here to reset your PIN...");
    res.json({ message: "Reset link sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
