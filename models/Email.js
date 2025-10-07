const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema(
  {
    senderType: { 
      type: String, 
      enum: ["admin", "superadmin"], 
      required: true 
    },
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Admin", 
      required: true 
    },
    senderEmail: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    recipientName: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ["sent", "failed"], 
      default: "sent" 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Email", emailSchema);