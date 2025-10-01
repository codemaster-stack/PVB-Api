const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const CreditCard = require("../models/Card");
const Transaction = require("../models/Transaction");
const path = require("path");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Generate random 10-digit account number
const generateAccountNumber = () =>
  Math.floor(1000000000 + Math.random() * 9000000000).toString();

// Ensure unique account number
const generateUniqueAccountNumber = async (field) => {
  let accountNumber;
  let exists = true;

  while (exists) {
    accountNumber = generateAccountNumber();
    const existingUser = await User.findOne({ [field]: accountNumber });
    if (!existingUser) {
      exists = false;
    }
  }
  return accountNumber;
};

// @desc Register new user
exports.register = async (req, res) => {
  try {
    const { fullname, email, phone, password } = req.body;

    if (!fullname || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const savingsAccountNumber = await generateUniqueAccountNumber("savingsAccountNumber");
    const currentAccountNumber = await generateUniqueAccountNumber("currentAccountNumber");

    const user = new User({
      fullname,
      email,
      phone,
      password,
      savingsAccountNumber,
      currentAccountNumber,
    });

    await user.save();

    res.status(201).json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      savingsAccountNumber: user.savingsAccountNumber,
      currentAccountNumber: user.currentAccountNumber,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check if user is deactivated BEFORE password check
    if (user.isActive === false) {
      return res.status(403).json({ 
        message: "Your account has been deactivated due to inactivity. Please contact customer care via mail or live chat.",
        type: "ACCOUNT_DEACTIVATED"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.json({
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      savingsAccountNumber: user.savingsAccountNumber,
      currentAccountNumber: user.currentAccountNumber,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a plain reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token before saving to DB
    user.resetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Create reset URL (frontend link)
    const resetUrl = `${process.env.FRONTEND_URL}/index.html?resetToken=${resetToken}`;

    // Send email
    // forgotPassword controller snippet
await sendEmail({
  email: user.email,
  subject: "🔐 Reset Your PVNBank Password",
  message: `You requested a password reset. Visit: ${resetUrl}`, // fallback text
  html: `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:auto; border:1px solid #eee; border-radius:8px; padding:20px;">
      <div style="text-align:center;">
        <img src="https://bank.pvbonline.online/image/logo.webp" alt="PVNBank Logo" style="width:120px; margin-bottom:20px;" />
        <h2 style="color:#2c3e50;">Password Reset Request</h2>
      </div>
      <p>Hello ${user.name || "User"},</p>
      <p>We received a request to reset your password for <b>PVNBank</b>.</p>
      <p>Please click the button below to set a new password. This link will expire in <b>15 minutes</b>.</p>
      <div style="text-align:center; margin:20px 0;">
        <a href="${resetUrl}" style="background:#007BFF; color:#fff; text-decoration:none; padding:12px 20px; border-radius:5px; font-weight:bold;">Reset Password</a>
      </div>
      <p>If you didn’t request this, you can safely ignore this email.</p>
      <br />
      <hr />
      <p style="font-size:12px; color:#777; text-align:center;">&copy; ${new Date().getFullYear()} PVNBank. All rights reserved.</p>
    </div>
  `,
});


    res.json({ message: "Reset link sent to your email" });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const token = req.body.token || req.params.token || req.query.resetToken;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Reset token is missing" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};


exports.createCreditCard = async (req, res) => {
  try {
    const { cardType, cardLimit } = req.body;
    const userId = req.user.id; // comes from protect middleware

    if (!cardType || !cardLimit) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newCard = new CreditCard({
      user: userId,
      cardType,
      cardLimit,
      status: "pending" // pending admin approval
    });

    await newCard.save();

    res.status(201).json({ message: "Credit card request submitted for approval" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id; // comes from auth middleware
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch balances from transactions
    const inflow = await Transaction.aggregate([
      { $match: { userId, type: "inflow" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const outflow = await Transaction.aggregate([
      { $match: { userId, type: "outflow" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      savingsAccountNumber: user.savingsAccountNumber,
      currentAccountNumber: user.currentAccountNumber,
      balances: {
        savings: user.savingsBalance || 0,
        current: user.currentBalance || 0,
        loan: user.loanBalance || 0,
        inflow: inflow[0]?.total || 0,
        outflow: outflow[0]?.total || 0,
      },
      lastLoginIP: user.lastLoginIP || "N/A",
      lastLoginDate: user.lastLoginDate || "N/A",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getTransactions = async (req, res) => {
  try {
    const currentUser = req.user;
    console.log("=== DEBUG INFO ===");
    console.log("Looking for transactions for user:", currentUser._id);
    console.log("User email:", currentUser.email);
    
    // Check what transactions exist in database
    const allTransactions = await Transaction.find({}).limit(10);
    console.log("All transactions (sample):");
    allTransactions.forEach((tx, index) => {
      console.log(`Transaction ${index + 1}:`, {
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        createdAt: tx.createdAt
      });
    });
    
    // Your original query
    const transactions = await Transaction.find({ userId: currentUser._id }).sort({ createdAt: -1 });
    console.log("Found matching transactions:", transactions.length);
    
    res.json(transactions);
  } catch (error) {
    console.error("Transaction error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      fullname,
      email,
      phone,
      profilePic,
      balances,
      savingsAccountNumber,
      currentAccountNumber,
    } = req.user;

    res.json({
      fullname,
      email,
      phone,
      profilePic,
      balances,
      savingsAccountNumber,
      currentAccountNumber,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateProfilePicture = async (req, res) => {
  try {
    if (!req.user) return res.status(404).json({ message: "User not found" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    
    // Cloudinary returns the full URL in req.file.path
    req.user.profilePic = req.file.path; // This is now the Cloudinary URL
    await req.user.save();
    
    res.json({
      message: "Profile picture updated",
      profilePic: req.user.profilePic, // Full Cloudinary URL
    });
  } catch (err) {
    console.error("Profile picture update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Check if user has PIN set up
exports.checkPinStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('transactionPin');
    
    res.status(200).json({
      hasPinSetup: !!user.transactionPin
    });

  } catch (error) {
    console.error("Check PIN status error:", error);
    res.status(500).json({ message: "Failed to check PIN status" });
  }
};



