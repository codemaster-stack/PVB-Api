// utils/sendEmail.js
const resend = require("../config/email");

/**
 * Send an email using Resend
 * @param {Object} options
 * @param {string|string[]} options.email - Recipient email or array of emails
 * @param {string} options.subject - Subject line
 * @param {string} [options.message] - Fallback plain-text message
 * @param {string} [options.html] - HTML body
 */
const sendEmail = async ({ email, subject, message, html }) => {
  try {
    const recipients = Array.isArray(email) ? email : [email]; // support multiple recipients

    await resend.emails.send({
      from: "Pauls Valley Bank <support@pvbonline.online>", // verified sender
      to: recipients,
      subject,
      html: html || `<p>${message}</p>`,
      text: message || "No text content",
    });

    console.log(`✅ Email sent to: ${recipients.join(", ")}`);
  } catch (error) {
    console.error("❌ Email sending error:", error.message);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;



