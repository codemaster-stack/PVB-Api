const LoanApplication = require("../models/loanApplication");
const nodemailer = require("nodemailer");

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


exports.reviewLoanApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminMessage } = req.body; // action = "approve" | "reject"

    const loan = await LoanApplication.findById(id);
    if (!loan) return res.status(404).json({ message: "Loan application not found" });

    const bankName = "Valley Bank";
    const logoUrl = "https://valley.pvbonline.online/image/logo.webp";

    loan.status = action === "approve" ? "approved" : "rejected";
    loan.adminMessage =
      adminMessage ||
      (action === "approve"
        ? "Your loan has been approved. Our loan officer will contact you shortly."
        : "Unfortunately, your loan was not approved at this time.");
    loan.reviewedBy = req.user._id;
    await loan.save();

    // 📨 Email the applicant
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f7f7f7;">
        <div style="background: white; max-width: 600px; margin: auto; border-radius: 8px; padding: 20px; border: 1px solid #eee;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoUrl}" alt="${bankName} Logo" style="width: 120px; margin-bottom: 10px;">
            <h2 style="color: #333;">${bankName}</h2>
          </div>
          <h3 style="color: ${action === "approve" ? "#28a745" : "#dc3545"};">
            Loan ${action === "approve" ? "Approved ✅" : "Rejected ❌"}
          </h3>
          <p>Dear <strong>${loan.applicantName}</strong>,</p>
          <p>${loan.adminMessage}</p>
          <p>Loan Type: <strong>${loan.loanType}</strong><br>
          Amount: <strong>$${loan.loanAmount.toLocaleString()}</strong></p>
          <br>
          <p style="color: #555;">Best regards,<br><strong>${bankName} Loans Department</strong></p>
        </div>
      </div>
    `;

    await sendEmail(
      loan.applicantEmail,
      `${bankName} - Loan Application ${action === "approve" ? "Approved" : "Rejected"}`,
      emailHtml
    );

    res.json({ message: `Loan ${action}ed successfully and email sent.`, loan });
  } catch (error) {
    console.error("Review loan error:", error);
    res.status(500).json({ message: "Failed to review loan application" });
  }
};
