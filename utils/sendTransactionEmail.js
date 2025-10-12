// utils/sendTransactionEmail.js
const sendEmail = require("./sendEmail");
const User = require("../models/User");

const BANK_NAME = "Pauls Valley Bank";
const BANK_LOGO_URL = "https://bank.pvbonline.online/image/logo.webp";

/**
 * Send transaction alert email
 * @param {Object} options
 * @param {string} options.userId - MongoDB user ID
 * @param {string} options.type - "credit" or "debit"
 * @param {number} options.amount - transaction amount
 * @param {number} options.balance - current balance
 * @param {string} [options.description] - optional description
 */
const sendTransactionEmail = async ({ userId, type, amount, balance, description }) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.email) return;

    const formattedAmount = `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const color = type === "credit" ? "#22c55e" : "#ef4444";
    const sign = type === "credit" ? "+" : "-";

    const html = `
      <div style="font-family:Arial, sans-serif; background:#f9fafb; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; padding:25px; border-radius:10px;">
          <div style="text-align:center;">
            <img src="${BANK_LOGO_URL}" alt="${BANK_NAME}" style="width:100px; margin-bottom:10px;">
            <h2 style="color:#1e40af;">${BANK_NAME}</h2>
            <h3 style="margin:0; color:#111827;">Transaction Alert</h3>
          </div>

          <hr style="margin:20px 0; border:none; border-top:1px solid #ddd;">

          <p>Dear <strong>${user.firstName || "Customer"}</strong>,</p>
          <p>A transaction has been processed on your account:</p>

          <table style="width:100%; border-collapse:collapse; font-size:15px;">
            <tr><td><strong>Type:</strong></td><td style="color:${color}; text-transform:capitalize;">${type}</td></tr>
            <tr><td><strong>Amount:</strong></td><td style="color:${color};">${sign}${formattedAmount}</td></tr>
            <tr><td><strong>Description:</strong></td><td>${description || "Transaction processed"}</td></tr>
            <tr><td><strong>Date:</strong></td><td>${new Date().toLocaleString()}</td></tr>
            <tr><td><strong>Available Balance:</strong></td><td><strong>$${Number(balance).toLocaleString()}</strong></td></tr>
          </table>

          <p style="margin-top:20px;">Thank you for banking with ${BANK_NAME}.</p>
          <p style="font-size:13px; color:#6b7280;">If you did not authorize this transaction, please contact support immediately.</p>
        </div>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: `${BANK_NAME} - ${type.toUpperCase()} Alert (${sign}${formattedAmount})`,
      html,
    });

    console.log(`📧 Transaction alert sent to ${user.email}`);
  } catch (error) {
    console.error("❌ Error sending transaction email:", error.message);
  }
};

module.exports = sendTransactionEmail;
