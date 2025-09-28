const LoanApplication = require("../models/loanApplication");

// @desc  Submit a new loan application
// @route POST /api/loans/apply
// @access Private (user must be logged in)
exports.applyForLoan = async (req, res) => {
  try {
    const { loanType, loanAmount, applicantName, applicantEmail, applicantPhone, annualIncome, loanPurpose } = req.body;

    if (!loanType || !loanAmount || !applicantName || !applicantEmail) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const loan = new LoanApplication({
      userId: req.user.id,  // comes from auth middleware
      loanType,
      loanAmount,
      applicantName,
      applicantEmail,
      applicantPhone,
      annualIncome,
      loanPurpose,
      status: "pending",
    });

    await loan.save();

    res.status(201).json({ message: "Loan application submitted", loan });
  } catch (error) {
    console.error("Loan application error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
