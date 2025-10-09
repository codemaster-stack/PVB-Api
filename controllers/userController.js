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
          
         // Password length check (min 6, max 15 characters for example)
    if (password.length < 6 || password.length > 15) {
      return res.status(400).json({
        message: "Password must be between 6 and 15 characters long",
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

    
        // Send welcome email
await sendEmail({ 
  email: user.email,
  subject: "🎉 Welcome to Pauls Valley Bank",
  message: `Hi ${fullname}, welcome to Pauls Valley Bank!\n
Your new account has been successfully created, and you now have access to all our digital banking services.\n
For your security, please keep your login details private and never share your PIN or password with anyone.\n
You can access your dashboard here: https://bank.pvbonline.online/index.html\n
If you didn’t register for this account, please ignore this email or contact our support immediately.`,
  html: `
    <div style="max-width:600px; margin:auto; padding:20px; font-family:Arial, sans-serif; border:1px solid #eaeaea; border-radius:10px;">
      <div style="text-align:center; margin-bottom:20px;">
        <img src="https://bank.pvbonline.online/image/logo.webp" alt="Pauls Valley Bank" style="max-width:150px; height:auto;" />
      </div>
      <h2 style="color:#004080; text-align:center;">Welcome to Pauls Valley Bank</h2>
      <p style="font-size:16px; color:#333;">Dear <b>${fullname}</b>,</p>
      <p style="font-size:15px; color:#555; line-height:1.6;">
        We’re excited to have you on board! 🎉 <br>
        Your new account has been successfully created, and you now have access to all our digital banking services.
      </p>
      <p style="font-size:15px; color:#555; line-height:1.6;">
        For your security, please remember to keep your login details private and never share your PIN or password with anyone.
      </p>
      <div style="text-align:center; margin:30px 0;">
        <a href="https://bank.pvbonline.online/index.html" 
           style="background-color:#004080; color:#fff; padding:12px 24px; text-decoration:none; border-radius:5px; font-weight:bold;">
          Go to Your Dashboard
        </a>
      </div>
      <p style="font-size:14px; color:#777; text-align:center;">
        If you didn’t register for this account, please ignore this email or contact our support immediately.
      </p>
      <hr style="margin:20px 0; border:none; border-top:1px solid #eee;" />
      <p style="font-size:12px; color:#aaa; text-align:center;">
        © ${new Date().getFullYear()} Pauls Valley Bank. All rights reserved. <br/>
        This is an automated email, please do not reply.
      </p>
    </div>
  `,
});



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
    await sendEmail({
  email: user.email,
  subject: "🔐 Reset Your PVNBank Password",
  message: `You requested a password reset for your PVNBank account. 
Click the link below (or copy and paste it into your browser):\n\n${resetUrl}\n\n
This link will expire in 15 minutes. If you didn’t request this, please ignore this email.`,
  html: `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:auto; border:1px solid #eee; border-radius:8px; padding:20px;">
      <div style="text-align:center;">
        <img src="https://bank.pvbonline.online/image/logo.webp" alt="PVNBank Logo" style="width:120px; margin-bottom:20px;" />
        <h2 style="color:#2c3e50;">Password Reset Request</h2>
      </div>
      <p>Hello ${user.fullname || "User"},</p>
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

exports.cardToAccount = async (req, res) => {
  // ✅ MUST be at the TOP before session
  const Card = require('../models/Card');
  const User = require('../models/User');
  const Transaction = require('../models/Transaction');
  const mongoose = require('mongoose');
  
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { cardId, accountType, amount } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!cardId || !accountType || !amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid transfer details' });
    }

    if (!['savings', 'current'].includes(accountType)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid account type' });
    }

    // Find card and user with session
    const card = await Card.findOne({ _id: cardId, userId, status: 'approved' }).session(session);
    const user = await User.findById(userId).session(session);

    if (!card) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Card not found or not approved' });
    }

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    // Check card balance
    if ((card.cardBalance || 0) < amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Insufficient card balance' });
    }

    // Process transfer WITH session
    card.cardBalance = (card.cardBalance || 0) - amount;
    await card.save({ session });

    if (!user.balances) {
      user.balances = { savings: 0, current: 0, loan: 0, inflow: 0, outflow: 0 };
    }
    
    user.balances[accountType] = (user.balances[accountType] || 0) + amount;
    user.balances.inflow = (user.balances.inflow || 0) + amount;
    await user.save({ session });

    // Create transaction WITH session and masked card
    const transactionId = `CARD_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await Transaction.create([{
      userId: user._id,
      type: 'inflow',
      transactionId,
      amount,
      description: `Transfer from card ending in ${card.cardNumber.slice(-4)} to ${accountType} account`,
      accountType,
      createdAt: new Date()
    }], { session });

    await session.commitTransaction();

    res.json({
      message: 'Transfer successful',
      newCardBalance: card.cardBalance,
      newAccountBalance: user.balances[accountType]
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Card to account transfer error:', error);
    res.status(500).json({ message: 'Transfer failed' });
  } finally {
    session.endSession();
  }
};

exports.getUserCards = async (req, res) => {
  try {
    const userId = req.user._id;
    const Card = require('../models/Card');
    
    const cards = await Card.find({ userId }).sort({ createdAt: -1 });
    
    res.json({ cards });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ message: 'Failed to fetch cards' });
  }
};