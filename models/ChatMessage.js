const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
      enum: ["admin", "user"]
    },
    senderEmail: {
      type: String,
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    receiverEmail: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);