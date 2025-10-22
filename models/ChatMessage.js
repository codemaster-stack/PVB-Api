// const mongoose = require("mongoose");

// const chatMessageSchema = new mongoose.Schema(
//   {
//     sender: {
//       type: String,
//       required: true,
//       enum: ["admin", "user"]
//     },
//     senderEmail: {
//       type: String,
//       required: true
//     },
//     senderName: {
//       type: String,
//       required: true
//     },
//     receiverEmail: {
//       type: String,
//       required: true
//     },
//     message: {
//       type: String,
//       required: true
//     },
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     isRead: {
//       type: Boolean,
//       default: false
//     },
//     // ✅ NEW: File upload fields
//     isFile: {
//       type: Boolean,
//       default: false
//     },
//     fileName: {
//       type: String,
//       default: null
//     },
//     fileType: {
//       type: String,
//       default: null
//     },
//     fileData: {
//       type: String, // Base64 encoded file
//       default: null
//     }
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("ChatMessage", chatMessageSchema);


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
    },
    // File upload fields
    isFile: {
      type: Boolean,
      default: false
    },
    fileName: {
      type: String,
      default: null
    },
    fileType: {
      type: String,
      default: null
    },
    fileData: {
      type: String, // Base64 encoded file
      default: null
    },
    // ✅ NEW: Track if chat session is ended
    chatEnded: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);