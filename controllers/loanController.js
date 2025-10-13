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

    res.status(201).json({ message: "Loan application submitted, our team will reach out to you via you mail", loan });
  } catch (error) {
    console.error("Loan application error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.reviewLoanApplication = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { action, adminMessage } = req.body; // "approve" | "reject"

    const loan = await LoanApplication.findById(id);
    if (!loan) return res.status(404).json({ message: "Loan application not found" });

    const bankName = "Valley Bank";
    const logoUrl = "https://bank.pvbonline.online/image/logo.webp";


    // ✅ Update loan record
    loan.status = action === "approve" ? "approved" : "rejected";
    loan.adminMessage =
      adminMessage ||
      (action === "approve"
        ? "Your loan has been approved. Our loan officer will contact you shortly."
        : "Unfortunately, your loan was not approved at this time.");
    loan.reviewedBy = req.user._id;
    await loan.save();

    // ✅ Construct email content
    const subject = `${bankName} - Loan Application ${action === "approve" ? "Approved" : "Rejected"}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="${bankName} Logo" style="width: 130px; height: auto; margin-bottom: 10px;" />
          <h2 style="color: #003366;">${bankName}</h2>
        </div>

        <h3 style="color: ${action === "approve" ? "#28a745" : "#dc3545"}; text-align:center;">
          Loan ${action === "approve" ? "Approved ✅" : "Rejected ❌"}
        </h3>

        <p style="font-size: 16px; color: #333;">Dear <strong>${loan.applicantName}</strong>,</p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          ${loan.adminMessage}
        </p>

        <div style="background: #f9f9f9; padding: 10px 15px; border-radius: 6px; margin-top: 15px;">
          <p style="margin: 5px 0;">💳 <strong>Loan Type:</strong> ${loan.loanType}</p>
          <p style="margin: 5px 0;">💰 <strong>Amount:</strong> $${loan.loanAmount.toLocaleString()}</p>
          <p style="margin: 5px 0;">📅 <strong>Status:</strong> ${loan.status.toUpperCase()}</p>
        </div>

        <p style="margin-top: 20px; color: #555;">Warm regards,</p>
        <p style="font-weight: bold; color: #003366;">${bankName} Loans Department</p>

        <hr style="margin: 25px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888; text-align: center;">
          &copy; ${new Date().getFullYear()} ${bankName}. All rights reserved.
        </p>
      </div>
    `;

    // ✅ Use Resend-based email utility
    await sendEmail({
      email: loan.applicantEmail,
      subject,
      html: emailHtml,
      message: `${loan.adminMessage} — Loan Type: ${loan.loanType}, Amount: $${loan.loanAmount}`,
    });

    res.json({ message: `Loan ${action}ed successfully and email sent.`, loan });
  } catch (error) {
    console.error("Review loan error:", error);
    res.status(500).json({ message: "Failed to review loan application" });
  }
};
