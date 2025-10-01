
// controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail"); // we'll create this

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};



exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Password length check (min 8, max 20 characters for example)
    if (password.length < 6 || password.length > 8) {
      return res.status(400).json({
        message: "Password must be between 8 and 20 characters long",
      });
    }

    // Optional: enforce stronger password (at least 1 number & 1 special char)
    const strongPasswordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain at least 1 number and 1 special character",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, phone, password });

    // Send welcome email
   await sendEmail({
  to: email,
  subject: "Welcome to Pauls Valley Bank",
  text: `Hi ${name}, welcome onboard!`, // fallback text for clients that don't support HTML
  html: `
  <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border: 1px solid #eaeaea; border-radius: 10px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://bank.pvbonline.online/image/logo.webp" alt="Pauls Valley Bank" style="max-width: 150px; height: auto;" />
    </div>
    <h2 style="color: #004080; text-align: center;">Welcome to Pauls Valley Bank</h2>
    <p style="font-size: 16px; color: #333;">Dear <b>${name}</b>,</p>
    <p style="font-size: 15px; color: #555; line-height: 1.6;">
      We’re excited to have you on board! 🎉 <br>
      Your new account has been successfully created, and you now have access to all our digital banking services.
    </p>
    <p style="font-size: 15px; color: #555; line-height: 1.6;">
      For your security, please remember to keep your login details private and never share your PIN or password with anyone.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://bank.pvbonline.online/index.html" 
         style="background-color: #004080; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Go to Your Dashboard
      </a>
    </div>
    <p style="font-size: 14px; color: #777; text-align: center;">
      If you didn’t register for this account, please ignore this email or contact our support immediately.
    </p>
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
    <p style="font-size: 12px; color: #aaa; text-align: center;">
      © ${new Date().getFullYear()} Pauls Valley Bank. All rights reserved. <br/>
      This is an automated email, please do not reply.
    </p>
  </div>
  `,
});


    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// @desc Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Generate a plain token
    const resetToken = crypto.randomBytes(20).toString("hex");
    
    // Hash it before storing in DB
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();
    
    // Send PLAIN token in email
    const resetUrl = `${process.env.FRONTEND_URL}/?resetToken=${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: `You requested a password reset. Click this link: ${resetUrl}`,
    });
    
    // Return debug info
    res.json({ 
      message: "Password reset email sent",
      debug: {
        plainToken: resetToken,
        hashedToken: hashedToken,
        tokenExpiry: user.resetPasswordExpire,
        tokenExpiryReadable: new Date(user.resetPasswordExpire).toISOString(),
        resetUrl: resetUrl
      }
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Email could not be sent", error: error.message });
  }
};
// --- Reset Password ---
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Debug info object
    const debugInfo = {
      receivedToken: token,
      tokenLength: token ? token.length : 0,
      currentTime: Date.now(),
      currentTimeReadable: new Date().toISOString()
    };
    
    if (!token) return res.status(400).json({ message: "Token is required", debug: debugInfo });
    
    // Hash the token before checking DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    debugInfo.hashedToken = hashedToken;
    
    // First, let's find ANY user with this hashed token (ignore expiry for now)
    const userWithToken = await User.findOne({ resetPasswordToken: hashedToken });
    debugInfo.userWithTokenFound = !!userWithToken;
    
    if (userWithToken) {
      debugInfo.storedToken = userWithToken.resetPasswordToken;
      debugInfo.tokenExpiry = userWithToken.resetPasswordExpire;
      debugInfo.tokenExpiryReadable = new Date(userWithToken.resetPasswordExpire).toISOString();
      debugInfo.isExpired = userWithToken.resetPasswordExpire < Date.now();
    }
    
    // Now check with expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    
    debugInfo.validUserFound = !!user;
    
    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired token",
        debug: debugInfo
      });
    }
    
    // If we get here, token is valid - proceed with reset
    // Hash password before saving
    const bcrypt = require('bcryptjs');
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    res.json({ 
      message: "Password reset successful",
      debug: debugInfo
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message
    });
  }
};