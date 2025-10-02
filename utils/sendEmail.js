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

// utils/sendEmail.js
// const emailTransporter = require("../config/email"); // ← ADD THIS LINE

// const sendEmail = async ({ email, subject, message, html }) => {
//   try {
//     const mailOptions = {
//       from: `"PVNBank Support" <support@pvbonline.online>`,
//       replyTo: process.env.EMAIL_USER,
//       to: email,
//       subject,
//       text: message,
//       html: html || message,
//     };

//     await emailTransporter.sendMail(mailOptions); // ← Changed from 'transporter' to 'emailTransporter'
//     console.log(`✅ Email sent to ${email}`);
//   } catch (error) {
//     console.error("❌ Email sending error:", error);
//     throw new Error("Email could not be sent");
//   }
// };

// module.exports = sendEmail;