// // config/email.js
// const nodemailer = require("nodemailer");

// const emailTransporter = nodemailer.createTransport({
//   host: process.env.ZOHO_HOST || "smtp.zoho.com",
//   port: process.env.ZOHO_PORT || 587,
//   secure: process.env.ZOHO_PORT == 465, // SSL if port=465, otherwise TLS
//   auth: {
//     user: process.env.ZOHO_EMAIL,
//     pass: process.env.ZOHO_PASS,
//   },
// });

//  // Verify connection on startup
// emailTransporter.verify((error, success) => {
//   if (error) {
//     console.error("❌ Email transporter error:", error);
//   } else {
//     console.log("✅ Email server is ready to send messages");
//   }
// });


// module.exports = emailTransporter;





// config/email.js
// config/email.js
const nodemailer = require("nodemailer");

console.log('🔍 Email Configuration Check:');
console.log('ZOHO_EMAIL:', process.env.ZOHO_EMAIL || '❌ NOT SET');
console.log('ZOHO_PASS:', process.env.ZOHO_PASS ? '✅ SET' : '❌ NOT SET');

const emailTransporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465, // Try SSL port instead
  secure: true, // Use SSL
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASS,
  },
  tls: {
    rejectUnauthorized: true
  }
});

// Verify connection on startup
emailTransporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

module.exports = emailTransporter;