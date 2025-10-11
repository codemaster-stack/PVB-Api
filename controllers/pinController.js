// controllers/pinController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail"); // already in your project
const crypto = require("crypto");

// Create PIN
exports.createPin = async (req, res) => {
  try {
    const { newPin } = req.body;
    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.transactionPin) {
      return res.status(400).json({ message: "PIN already set" });
    }

    const salt = await bcrypt.genSalt(10);
    user.transactionPin = await bcrypt.hash(newPin, salt);
    await user.save();

    res.json({ message: "PIN created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Verify PIN
exports.verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.transactionPin) {
      return res.status(400).json({ message: "No PIN set" });
    }

    const isMatch = await user.matchPin(pin);
    if (!isMatch) return res.status(400).json({ message: "Invalid PIN" });

    res.json({ message: "PIN verified" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.forgotPin = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1️⃣ Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // 2️⃣ Hash token & set expiry in DB
    user.resetPinToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPinExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // 3️⃣ Create reset URL
    const resetUrl = `${req.protocol}://${req.get("host")}/api/users/reset-pin/${resetToken}`;

    // 4️⃣ Build HTML email
    const html = `
      <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border: 1px solid #eaeaea; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://bank.pvbonline.online/image/logo.webp" alt="Pauls Valley Bank" style="max-width: 150px; height: auto;" />
        </div>
        <h2 style="color: #004080; text-align: center;">PIN Reset Request</h2>
        <p style="font-size: 16px; color: #333;">Dear <b>${user.fullname}</b>,</p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          We received a request to reset your PIN. If you made this request, please click the button below to reset your PIN securely:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #004080; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset My PIN
          </a>
        </div>
        <p style="font-size: 14px; color: #555; line-height: 1.6;">
          If you did not request a PIN reset, you can safely ignore this email. Your account will remain secure.
        </p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #aaa; text-align: center;">
          © ${new Date().getFullYear()} Pauls Valley Bank. All rights reserved. <br/>
          This is an automated email, please do not reply.
        </p>
      </div>
    `;

    // 5️⃣ Send Email (Resend format)
    await sendEmail({
      email: user.email, // ✅ correct key name
      subject: "🔐 PIN Reset Request - Pauls Valley Bank",
      message: `Dear ${user.fullname}, You requested a PIN reset. Visit this link to reset: ${resetUrl}`, // fallback text
      html,
    });

    res.json({ message: "✅ Reset link sent to your email" });
  } catch (err) {
    console.error("Forgot PIN error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
