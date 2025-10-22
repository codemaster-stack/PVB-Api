const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage");
const {protectAdmin, protectSuperAdmin } = require("../middleware/adminMiddleware");
const { protect } = require("../middleware/auth");

// @desc    Get all chat history (superadmin only)
// @route   GET /api/chat/history
router.get("/history", protectAdmin, async (req, res) => {
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
router.get("/history/:email", protectAdmin, async (req, res) => {
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




router.get("/my-history", protect, async (req, res) => {
  try {
    const userEmail = req.user.email; // From auth middleware
    
    const messages = await ChatMessage.find({
      $or: [
        { senderEmail: userEmail },
        { receiverEmail: userEmail }
      ]
    })
    .sort({ createdAt: 1 })
    .limit(100); // Last 100 messages
    
    res.json({ messages });
  } catch (error) {
    console.error("Error fetching user chat history:", error);
    res.status(500).json({ message: "Error fetching chat history" });
  }
});


// @desc    Mark messages as read
// @route   PUT /api/chat/mark-read
// @access  Private
router.put("/mark-read", protect, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    await ChatMessage.updateMany(
      { receiverEmail: userEmail, isRead: false },
      { isRead: true }
    );
    
    res.json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error marking messages as read" });
  }
});

// @desc    Get unread message count
// @route   GET /api/chat/unread-count
// @access  Private
router.get("/unread-count", protect, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    const count = await ChatMessage.countDocuments({
      receiverEmail: userEmail,
      isRead: false
    });
    
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread count" });
  }
});



// @desc    End chat session and delete history
// @route   DELETE /api/chat/end/:visitorId
// @access  Admin only
router.delete("/end/:visitorId", protectAdmin, async (req, res) => {
  try {
    const visitorId = req.params.visitorId;
    
    // Delete all messages for this conversation
    const result = await ChatMessage.deleteMany({
      $or: [
        { senderEmail: visitorId, receiverEmail: "admin" },
        { senderEmail: "admin", receiverEmail: visitorId },
        { senderEmail: visitorId },
        { receiverEmail: visitorId }
      ]
    });
    
    console.log(`✅ Deleted ${result.deletedCount} messages for ${visitorId}`);
    
    res.json({ 
      message: "Chat session ended successfully",
      deletedCount: result.deletedCount,
      visitorId: visitorId
    });
    
  } catch (error) {
    console.error("Error ending chat:", error);
    res.status(500).json({ message: "Failed to end chat session" });
  }
});

module.exports = router;
