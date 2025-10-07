// models/Admin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken: String,
    resetTokenExpiry: Date,
    role: { type: String, enum: ["admin", "superadmin"], default: "admin" },  // ADD THIS
    wallet: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },  // ADD THIS
    deletedAt: { type: Date },  // ADD THIS
    deletedBy: { type: String, enum: ["superadmin"] },  // ADD THIS (only superadmin can delete admins)
    isActive: { type: Boolean, default: true },  // ADD THIS
    deactivatedBy: { type: String, enum: ["superadmin"] },  // ADD THIS
  },
  { timestamps: true }
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
