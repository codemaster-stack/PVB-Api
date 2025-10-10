const mongoose = require("mongoose");

const loanApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // optional in case non-logged users can apply
    },
    loanType: { type: String, required: true },
    loanAmount: { type: Number, required: true },
    applicantName: { type: String, required: true },
    applicantEmail: { type: String, required: true },
    applicantPhone: { type: String, required: true },
    annualIncome: { type: Number, required: true },
    loanPurpose: { type: String, required: true },

    // status options: pending, approved, rejected
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    adminMessage: { type: String }, // message sent by admin
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin who reviewed
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoanApplication", loanApplicationSchema);
