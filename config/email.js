// config/email.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;








// config/email.js
// const nodemailer = require("nodemailer");

// const emailTransporter = nodemailer.createTransport({
//   host: "smtp.zoho.com",
//   port: 587, // use TLS port
//   secure: false, // must be false for port 587
//   auth: {
//     user: process.env.ZOHO_EMAIL,
//     pass: process.env.ZOHO_PASS,
//   },
//   tls: {
//     rejectUnauthorized: true,
//   },
// });

// emailTransporter.verify((error, success) => {
//   if (error) {
//     console.error("❌ Email transporter error:", error);
//   } else {
//     console.log("✅ Email server is ready to send messages");
//   }
// });

// module.exports = emailTransporter;
