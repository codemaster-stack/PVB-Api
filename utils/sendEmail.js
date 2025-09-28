// utils/sendEmail.js
const transporter = require("../config/email");

const sendEmail = async ({ email, subject, message, html }) => {
  try {
    const mailOptions = {
      from: `"Pauls Valley Bank Support" <${process.env.ZOHO_EMAIL}>`,
      to: email,
      subject,
      text: message, // fallback for clients that don’t render HTML
      html: html || message, // prefer HTML, fallback to plain text
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);
  } catch (error) {
    console.error("❌ Email sending error:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;
