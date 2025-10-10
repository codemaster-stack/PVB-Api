const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    savingsAccountNumber: { type: String, unique: true },
    currentAccountNumber: { type: String, unique: true },
    profilePic: { type: String },

    balances: {
      savings: { type: Number, default: 0 },
      current: { type: Number, default: 0 },
      loan: { type: Number, default: 0 },
      inflow: { type: Number, default: 0 },
      outflow: { type: Number, default: 0 },
    },

    transactionPin: {
      type: String,
      select: false,
    },

    resetToken: String,
    resetTokenExpiry: Date,
    pinResetToken: String,
    pinResetTokenExpiry: Date,
    
    // ========== USER ROLE & STATUS ==========
    role: { 
      type: String, 
      enum: ["user", "admin", "superadmin"], 
      default: "user" 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    
    // ========== DEACTIVATION TRACKING ==========
    deactivatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null 
    },
    deactivatedByRole: { 
      type: String, 
      enum: ["admin", "superadmin"], 
      default: null 
    },
    deactivatedAt: { 
      type: Date, 
      default: null 
    },
    
    // ========== REACTIVATION TRACKING ==========
    reactivatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      default: null 
    },
    reactivatedAt: { 
      type: Date, 
      default: null 
    },
    
    // ========== SOFT DELETE TRACKING ==========
    isDeleted: { 
      type: Boolean, 
      default: false 
    },
    deletedAt: { 
      type: Date,
      default: null 
    },
    deletedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null 
    },
    deletedByRole: { 
      type: String, 
      enum: ["admin", "superadmin"],
      default: null 
    },
  },
  { timestamps: true }
);

// 🔑 Hash password & transaction PIN before save
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (this.isModified("transactionPin")) {
    this.transactionPin = await bcrypt.hash(this.transactionPin, 10);
  }

  next();
});

// 🔑 Compare PIN
userSchema.methods.matchPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.transactionPin);
};

// 🔍 Helper: Check if user can be reactivated by current admin
userSchema.methods.canBeReactivatedBy = function (adminRole, adminId) {
  if (!this.isActive) {
    // Super admin can reactivate anyone
    if (adminRole === 'superadmin') return true;
    
    // Admin can ONLY reactivate users they personally deactivated
    if (adminRole === 'admin' && 
        this.deactivatedByRole === 'admin' && 
        this.deactivatedBy && 
        this.deactivatedBy.toString() === adminId.toString()) {
      return true;
    }
  }
  return false;
};

module.exports = mongoose.model("User", userSchema);