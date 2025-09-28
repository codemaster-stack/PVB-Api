// routes/dashboard.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/User");

// Get user dashboard data
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      name: user.name,
      email: user.email,
      balances: user.balances,
      transactions: user.transactions.slice(-5), // latest 5
      lastLoginIp: user.lastLoginIp,
      lastLoginDate: user.lastLoginDate
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Transfer money
router.post("/transfer", protect, async (req, res) => {
  try {
    const { amount, recipient, description } = req.body;
    const user = await User.findById(req.user._id);

    if (user.balances.current < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    user.balances.current -= amount;
    user.transactions.push({
      description: description || `Transfer to ${recipient}`,
      amount: -amount,
      type: "outflow",
      balance: user.balances.current
    });

    await user.save();
    res.json({ success: true, balances: user.balances });
  } catch (err) {
    res.status(500).json({ message: "Transfer failed" });
  }
});

module.exports = router;
