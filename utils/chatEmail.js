// utils/chatEmail.js
const sendEmail = require("./sendEmail");
const Admin = require("../models/Admin");

const BANK_NAME = "Pauls Valley Bank";
const BANK_LOGO_URL = "https://bank.pvbonline.online/image/logo.webp";

/**
 * Get all active admin emails from database
 * @returns {Promise<Array>} Array of admin email addresses
 */
async function getAllAdminEmails() {
  try {
    // Fetch all active admins (both admin and superadmin roles)
    const admins = await Admin.find({ 
      isActive: true,
      isDeleted: false,
      role: { $in: ['admin', 'superadmin'] }
    }).select('email username');
    
    const emails = admins.map(admin => admin.email).filter(email => email);
    
    console.log(`📋 Found ${emails.length} active admin(s) in database`);
    
    if (emails.length === 0) {
      console.warn('⚠️ No active admins found');
      return [];
    }
    
    return emails;
  } catch (error) {
    console.error('❌ Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Send chat notification email to all admins
 * @param {Object} options
 * @param {string} options.visitorEmail - User's email address
 * @param {string} options.visitorName - User's full name
 * @param {string} options.message - The first message content
 * @param {boolean} [options.isFile] - Whether the message is a file
 * @param {string} [options.fileName] - Name of the file (if applicable)
 */
const sendNewChatNotification = async ({ visitorEmail, visitorName, message, isFile = false, fileName = null }) => {
  try {
    // Get all admin emails
    const adminEmails = await getAllAdminEmails();
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails available to send notification');
      return;
    }
    
    console.log(`📧 Preparing to send chat notification to ${adminEmails.length} admin(s)`);
    
    // Prepare message content
    let messageContent = '';
    
    if (isFile) {
      messageContent = `
        <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #2196F3; margin: 10px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>📎 File sent:</strong> ${fileName}</p>
          ${message !== `Sent a file: ${fileName}` ? `<p style="margin: 8px 0 0 0;">${message}</p>` : ''}
        </div>
      `;
    } else {
      messageContent = `
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0; border-radius: 4px;">
          ${message}
        </div>
      `;
    }

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${BANK_LOGO_URL}" alt="${BANK_NAME}" style="width: 80px; margin-bottom: 15px;">
            <h1 style="color: #2c3e50; margin: 10px 0 0 0; font-size: 24px;">💬 New Chat Message</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 14px;">A customer needs your attention</p>
          </div>
          
          <hr style="border: none; border-top: 2px solid #ecf0f1; margin: 25px 0;">
          
          <!-- Customer Info -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #34495e; margin: 0 0 15px 0; font-size: 16px;">Customer Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d; font-weight: 600; width: 80px;">Name:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${visitorName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${visitorEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #7f8c8d; font-weight: 600;">Time:</td>
                <td style="padding: 8px 0; color: #2c3e50;">${new Date().toLocaleString('en-US', { 
                  dateStyle: 'medium', 
                  timeStyle: 'short' 
                })}</td>
              </tr>
            </table>
          </div>
          
          <!-- Message Content -->
          <div style="margin: 25px 0;">
            <h3 style="color: #34495e; margin: 0 0 12px 0; font-size: 16px;">Message:</h3>
            ${messageContent}
          </div>
          
          <!-- Alert Box -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: white; text-align: center; font-size: 15px;">
              <strong>⚡ This is their FIRST message!</strong><br>
              <span style="font-size: 13px; opacity: 0.9;">Please respond as soon as possible to provide excellent service.</span>
            </p>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://valley.pvbonline.online/admin" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 14px 40px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      display: inline-block; 
                      font-weight: 600;
                      font-size: 15px;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              📱 Open Admin Panel
            </a>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1; text-align: center;">
            <p style="color: #95a5a6; font-size: 12px; margin: 5px 0;">
              This is an automated notification from ${BANK_NAME} Chat System
            </p>
            <p style="color: #bdc3c7; font-size: 11px; margin: 5px 0;">
              You're receiving this because you're an administrator
            </p>
          </div>
          
        </div>
      </div>
    `;

    // Send email to all admins
    for (const adminEmail of adminEmails) {
      await sendEmail({
        email: adminEmail,
        subject: `🔔 ${BANK_NAME} - New Chat from ${visitorName}`,
        html,
      });
    }

    console.log(`✅ Chat notification sent to ${adminEmails.length} admin(s)`);
    console.log(`📬 Recipients: ${adminEmails.join(', ')}`);
    
  } catch (error) {
    console.error("❌ Error sending chat notification email:", error.message);
  }
};

module.exports = sendNewChatNotification;