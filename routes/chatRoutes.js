const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage");
const {protectSuperAdmin } = require("../middleware/adminMiddleware");

// @desc    Get all chat history (superadmin only)
// @route   GET /api/chat/history
router.get("/history", protectSuperAdmin, async (req, res) => {
  try {
    const messages = await ChatMessage.find()
      .sort({ createdAt: -1 })
      .limit(1000); // Get last 1000 messages
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching chat history" });
  }
});

// @desc    Get chat history by visitor/user email
// @route   GET /api/chat/history/:email
router.get("/history/:email", protectSuperAdmin, async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      $or: [
        { senderEmail: req.params.email },
        { receiverEmail: req.params.email }
      ]
    }).sort({ createdAt: 1 });
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching chat history" });
  }
});

module.exports = router;