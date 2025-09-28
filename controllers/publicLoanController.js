const LoanApplication = require("../models/loanApplication");

exports.publicLoanApply = async (req, res) => {
  try {
    const { loanType, loanAmount, applicantName, applicantEmail, applicantPhone, annualIncome, loanPurpose } = req.body;

    if (!loanType || !loanAmount || !applicantName || !applicantEmail) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const loan = new LoanApplication({
      loanType,
      loanAmount,
      applicantName,
      applicantEmail,
      applicantPhone,
      annualIncome,
      loanPurpose,
      status: "pending",
      submittedFrom: "index-page",
    });

    await loan.save();

    res.status(201).json({ message: "Loan application submitted", loan });
  } catch (error) {
    console.error("Loan application error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
