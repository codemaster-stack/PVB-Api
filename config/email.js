// config/email.js
const nodemailer = require("nodemailer");

const emailTransporter = nodemailer.createTransport({
  host: process.env.ZOHO_HOST || "smtp.zoho.com",
  port: process.env.ZOHO_PORT || 587,
  secure: process.env.ZOHO_PORT == 465, // SSL if port=465, otherwise TLS
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASS,
  },
});

module.exports = emailTransporter;
