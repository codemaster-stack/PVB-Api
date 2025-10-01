// controllers/adminAuthController.js
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const path = require("path");
const ContactMessage = require("../models/ContactMessage");
const LoanApplication = require("../models/loanApplication");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Register new admin
exports.registerAdmin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

          // Password length check (min 8, max 20 characters for example)
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


    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const admin = await Admin.create({ username, email, password });
    res.status(201).json({
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      token: generateToken(admin._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login admin
exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (admin && (await admin.matchPassword(password))) {
      res.json({
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        token: generateToken(admin._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    next(error);
  }
};


// @desc    Forgot password (send reset email)
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Create a plain reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token before saving to DB
    admin.resetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    admin.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await admin.save();

    // Create reset URL (frontend link)
    const resetUrl = `${process.env.FRONTEND_URL}/admin-signup.html?resetToken=${resetToken}`;

    // Send email
    // await sendEmail({
    //   email: admin.email,
    //   subject: "PVNBank Admin Password Reset",
    //   message: `You requested a password reset. Click here to reset your password:\n\n${resetUrl}\n\nThis link will expire in 25 minutes.`,
    // });
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
    const { token, password } = req.body; // <-- adjust key here

    // Hash incoming token to match DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find admin with matching token and not expired
    const admin = await Admin.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Update password (pre-save hook hashes it)
    admin.password = password;
    admin.resetToken = undefined;
    admin.resetTokenExpiry = undefined;
    await admin.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};



exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password -transactionPin -resetToken -pinResetToken');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOneAndDelete({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};



exports.deactivateUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOneAndUpdate(
      { email }, 
      { isActive: false },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
};

// Add reactivation function
exports.reactivateUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOneAndUpdate(
      { email }, 
      { isActive: true },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ message: 'Failed to reactivate user' });
  }
};


// Fund user account
exports.fundUser = async (req, res) => {
  try {
    const { email, amount, accountType, description, date } = req.body;
    
    console.log('Fund user request data:', { email, amount, accountType, description, date });
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user balance
    user.balances[accountType] += parseFloat(amount);
    user.balances.inflow += parseFloat(amount);
    await user.save();
    
    console.log('Balance updated, now creating transaction...');
    const transactionId = Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    // Create transaction record with detailed logging
    try {
       const transactionData = {
       userId: user._id,           // Changed from toAccountId
       type: 'inflow',  
       transactionId: transactionId,          // Changed from 'credit'
       amount: parseFloat(amount),
       description: description,
       createdAt: date ? new Date(date) : new Date()  // Changed from transactionDate
       };
      
      console.log('Transaction data:', transactionData);
      
      const transaction = await Transaction.create(transactionData);
      console.log('Transaction created successfully:', transaction);
      
    } catch (transactionError) {
      console.error('TRANSACTION CREATE ERROR:', transactionError);
      console.error('Error details:', transactionError.message);
      // Continue - balance was updated successfully
    }
    
    res.json({ message: 'User account funded successfully' });
  } catch (error) {
    console.error('Fund user error:', error);
    res.status(500).json({ message: 'Failed to fund user account' });
  }
};

// Transfer funds between users
exports.transferFunds = async (req, res) => {
  try {
    const { 
      senderEmail, 
      receiverEmail, 
      amount, 
      fromAccount, 
      toAccount, 
      senderDescription,    // New field
      receiverDescription,  // New field
      date 
    } = req.body;
    
    const sender = await User.findOne({ email: senderEmail });
    const receiver = await User.findOne({ email: receiverEmail });
    
    if (!sender || !receiver) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const transferAmount = parseFloat(amount);
    
    // Check balance and update balances
    if (sender.balances[fromAccount] < transferAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    sender.balances[fromAccount] -= transferAmount;
    sender.balances.outflow += transferAmount;
    receiver.balances[toAccount] += transferAmount;
    receiver.balances.inflow += transferAmount;
    
    await sender.save();
    await receiver.save();
    
    const transactionDate = date ? new Date(date) : new Date();
    
    // Create sender transaction with sender-specific description
    const senderTransactionData = {
      userId: sender._id,
      type: 'outflow',
      amount: transferAmount,
      description: senderDescription || `Transfer to ${receiver.fullname || receiverEmail}`,
      createdAt: transactionDate
    };
    
    // Create receiver transaction with receiver-specific description
    const receiverTransactionData = {
      userId: receiver._id,
      type: 'inflow',
      amount: transferAmount,
      description: receiverDescription || `Transfer from ${sender.fullname || senderEmail}`,
      createdAt: transactionDate
    };
    
    await Transaction.create(senderTransactionData);
    await Transaction.create(receiverTransactionData);
    
    res.json({ message: 'Funds transferred successfully' });
    
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Failed to transfer funds' });
  }
};

// Send email to user
exports.sendEmail = async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await sendEmail({
      email: user.email,
      subject: subject,
      message: message
    });
    
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
};


exports.updateUserProfile = async (req, res) => {
  try {
    const { email } = req.params;
    const updateData = req.body;
    
    // Handle file upload if present
    if (req.file) {
      updateData.profilePic = req.file.path; // Cloudinary URL
    }
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.transactionPin;
    delete updateData.balances;
    
    const user = await User.findOneAndUpdate(
      { email }, 
      updateData,
      { new: true, select: '-password -transactionPin' }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'User profile updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Failed to update user profile' });
  }
};

exports.getAllMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
};

// Get all loan applications
exports.getAllLoans = async (req, res) => {
  try {
    const loans = await LoanApplication.find().sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: "Error fetching loan applications" });
  }
};



exports.getActiveUsers = async (req, res) => {
  try {
    // onlineUsers is only in memory (from socket.io)
    // For persistent list, fetch from DB
    res.json(Object.keys(onlineUsers)); 
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
};
