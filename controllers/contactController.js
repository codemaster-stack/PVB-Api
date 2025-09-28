// controllers/contactController.js
const ContactMessage = require("../models/ContactMessage");

exports.submitContactMessage = async (req, res) => {
  try {
    const { email, phone, subject, message } = req.body;

    // If logged in (user dashboard) → req.user will exist once you add authMiddleware
    let senderRole = "guest";
    let userId = null;
    let name = req.body.name || "Guest User";

    if (req.user) {
      senderRole = "user";
      userId = req.user.id;
      name = req.user.name || name;
    }

    const contactMessage = new ContactMessage({
      userId,
      name,
      email,
      phone,
      subject,
      message,
      replies: [{ senderRole, message }],
    });

    await contactMessage.save();

    res.status(201).json({
      success: true,
      message: "Your message has been received. Our support team will contact you soon.",
      data: contactMessage,
    });
  } catch (error) {
    console.error("Contact error:", error);
    res.status(500).json({ success: false, message: "Failed to submit message" });
  }
};
