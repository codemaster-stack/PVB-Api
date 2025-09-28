// models/LoanApplication.js
const mongoose = require("mongoose");

const loanApplicationSchema = new mongoose.Schema({
  loanType: { type: String, required: true },
  loanAmount: { type: Number, required: true },
  applicantName: { type: String, required: true },
  applicantEmail: { type: String, required: true },
  applicantPhone: { type: String, required: true },
  annualIncome: { type: Number, required: true },
  loanPurpose: { type: String, required: true },
  status: { type: String, default: "unread" }, // unread or read
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("LoanApplication", loanApplicationSchema);
