// utils/sendEmail.js
const transporter = require("../config/email");

const sendEmail = async ({ email, subject, message }) => {
  try {
    const mailOptions = {
      from: `"PVNBank Support" <support@pvbonline.online>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; background: #f7f9fc; padding: 20px;">
          <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:8px; padding:20px;">
            <div style="text-align:center; margin-bottom:20px;">
              <img src="https://valley.pvbonline.online/assets/logo.png" alt="PVNBank Logo" style="width:120px;">
            </div>
            <h2 style="color:#0a3d62;">${subject}</h2>
            <p style="font-size:15px; color:#333;">${message}</p>
            <hr style="margin:20px 0;">
            <p style="font-size:12px; color:#888;">© ${new Date().getFullYear()} PVNBank. All rights reserved.</p>
          </div>
        </div>
      `
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
// const transporter = require("../config/email");

// const sendEmail = async ({ email, subject, message, html }) => {
//   try {
//     const mailOptions = {
//       from: `"PVNBank Support" <support@pvbonline.online>`, // Your custom email
//       to: email,
//       subject,
//       text: message,
//       html: html || message,
//     };

//     await transporter.sendMail(mailOptions);
//     console.log(`✅ Email sent to ${email}`);
//   } catch (error) {
//     console.error("❌ Email sending error:", error);
//     throw new Error("Email could not be sent");
//   }
// };

// module.exports = sendEmail;