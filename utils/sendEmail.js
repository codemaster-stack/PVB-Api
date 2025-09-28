// utils/sendEmail.js
const transporter = require("../config/email");

const sendEmail = async ({ email, subject, message }) => {
  try {
    const mailOptions = {
      from: `"PVNBank Support" <${process.env.ZOHO_EMAIL}>`,
      to: email,
      subject,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);
  } catch (error) {
    console.error("❌ Email sending error:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;
