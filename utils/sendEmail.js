// utils/sendEmail.js
// const transporter = require("../config/email");

// const sendEmail = async ({ email, subject, message, html }) => {
//   try {
//     const mailOptions = {
//       from: `"Pauls Valley Bank Support" <${process.env.ZOHO_EMAIL}>`,
//       to: email,
//       subject,
//       text: message, // fallback for clients that don’t render HTML
//       html: html || message, // prefer HTML, fallback to plain text
//     };

//     await transporter.sendMail(mailOptions);
//     console.log(`✅ Email sent to ${email}`);
//   } catch (error) {
//     console.error("❌ Email sending error:", error);
//     throw new Error("Email could not be sent");
//   }
// };

// module.exports = sendEmail;


const sendEmail = async ({ email, subject, message, html }) => {
  try {
    const mailOptions = {
      from: `"PVNBank Support" <support@pvbonline.online>`, // ← Your custom email
      replyTo: process.env.EMAIL_USER, // Gmail as reply-to
      to: email,
      subject,
      text: message,
      html: html || message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);
  } catch (error) {
    console.error("❌ Email sending error:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;