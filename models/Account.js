// models/Account.js
const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accountNumber: {
       type: String,
       unique: true,
    },

    accountType: {
      type: String,
      enum: ["savings", "checking"],
      default: "savings",
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Generate unique account number
accountSchema.pre("save", async function (next) {
  if (!this.isNew) return next();
  
  // Generate 10-digit account number
  let accountNumber;
  let exists = true;
  
  while (exists) {
    accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    exists = await mongoose.models.Account.findOne({ accountNumber });
  }
  
  this.accountNumber = accountNumber;
  next();
});

module.exports = mongoose.model("Account", accountSchema);