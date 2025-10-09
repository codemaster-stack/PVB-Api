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
const Email = require("../models/Email");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const generateAccountNumber = () =>
  Math.floor(1000000000 + Math.random() * 9000000000).toString();

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



// @desc    Register new admin
exports.registerAdmin = async (req, res, next) => {
  try {
    const { username, email, password, secretCode } = req.body;

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

    // const admin = await Admin.create({ username, email, password });
    // Check if secret code matches for superadmin creation
    let role = "admin";  // default role
    if (secretCode === "SUPER_ADMIN_SECRET_2660") {  // Change this to your own secret code
    role = "superadmin";
    }

     const admin = await Admin.create({ username, email, password, role });  // ADD role HERE
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

    // Check if admin exists and password matches
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if admin is deactivated by super admin
    if (admin.isActive === false) {
      return res.status(403).json({ 
        message: "Your account has been deactivated. Contact Super Admin to reactivate." 
      });
    }

    // Admin is active, proceed with login
    res.json({
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id),
    });
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
  email: admin.email,
  subject: "🔐 Reset Your PVNBank Password",
  message: `You requested a password reset. Visit: ${resetUrl}`, // fallback text
  html: `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; max-width:600px; margin:auto; border:1px solid #eee; border-radius:8px; padding:20px;">
      <div style="text-align:center;">
        <img src="https://bank.pvbonline.online/image/logo.webp" alt="PVNBank Logo" style="width:120px; margin-bottom:20px;" />
        <h2 style="color:#2c3e50;">Password Reset Request</h2>
      </div>
      <p>Hello ${admin.username || "admin"},</p>
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
   const users = await User.find({ isDeleted: { $ne: true } }, '-password -transactionPin -resetToken -pinResetToken');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('🗑️ Attempting to delete user:', email);
    
    // Get admin info (works with both req.user and req.admin)
    const admin = req.user || req.admin;
    
    if (!admin) {
      console.error('❌ No admin found in request');
      return res.status(401).json({ message: 'Admin authentication failed' });
    }
    
    console.log('👮 Admin deleting user:', { adminEmail: admin.email, adminRole: admin.role });
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already deleted
    if (user.isDeleted) {
      return res.status(400).json({ message: 'User is already in recycle bin' });
    }
    
    console.log('✅ User found, moving to recycle bin');
    
    // Soft delete - move to recycle bin instead of permanent delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = admin._id;
    user.deletedByAdminId = admin.role || 'admin';
    await user.save();
    
    console.log('✅ User moved to recycle bin successfully');
    
    // Optional: Log this action
    const Transaction = require('../models/Transaction'); // Make sure path is correct
    await Transaction.create({
      userId: admin._id,
      type: 'admin_action',
      transactionId: `DEL_${Date.now()}`,
      amount: 0,
      description: `Deleted user: ${user.email}`,
      accountType: 'admin',
      createdAt: new Date()
    }).catch(err => console.error('Failed to log deletion:', err));
    
    res.json({ 
      message: 'User moved to recycle bin successfully',
      deletedBy: admin.role,
      deletedUser: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
    
  } catch (error) {
    console.error('❌ Delete user error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// Restore user from recycle bin (Super Admin only)
exports.restoreUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email, isDeleted: true });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found in recycle bin' });
    }
    
    user.isDeleted = false;
    user.deletedAt = null;
    user.deletedBy = null;
    await user.save();
    
    res.json({ message: 'User restored successfully' });
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({ message: 'Failed to restore user' });
  }
};

// Get all deleted users (Super Admin only)
exports.getDeletedUsers = async (req, res) => {
  try {
    const deletedUsers = await User.find({ isDeleted: true }).select('-password -transactionPin');
    res.json({ users: deletedUsers });
  } catch (error) {
    console.error('Get deleted users error:', error);
    res.status(500).json({ message: 'Failed to fetch deleted users' });
  }
};

// Permanent delete (Super Admin only)
exports.permanentDeleteUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOneAndDelete({ email, isDeleted: true });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found in recycle bin' });
    }
    
    res.json({ message: 'User permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ message: 'Failed to permanently delete user' });
  }
};
exports.deactivateUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deactivating yourself
    if (user._id.toString() === req.admin._id.toString() || 
        user._id.toString() === req.user?._id.toString()) {
      return res.status(400).json({ message: 'You cannot deactivate yourself' });
    }
    
    // Store who deactivated and their role
    user.isActive = false;
    user.deactivatedBy = req.admin._id || req.user._id; // Store admin ID
    user.deactivatedByRole = req.admin.role || req.user.role; // Store role
    user.deactivatedAt = new Date();
    await user.save();
    
    res.json({ 
      message: 'User deactivated successfully',
      deactivatedBy: req.admin.role 
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
};

exports.reactivateUser = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    console.log('🔍 Reactivate attempt:', {
      userEmail: email,
      adminRole: req.admin.role,
      adminId: req.admin._id.toString(),
      userDeactivatedByRole: user?.deactivatedByRole,
      userDeactivatedBy: user?.deactivatedBy?.toString()
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isActive) {
      return res.status(400).json({ message: 'User is already active' });
    }
    
    // CRITICAL: Check admin permissions FIRST
    if (req.admin.role !== 'superadmin') {
      // Regular admin restrictions
      
      // Block if deactivated by superadmin
      if (user.deactivatedByRole === 'superadmin') {
        console.log('❌ Admin blocked: User was deactivated by superadmin');
        return res.status(403).json({ 
          message: 'Access denied. This user was deactivated by Super Admin and can only be reactivated by Super Admin.' 
        });
      }
      
      // Block if deactivated by another admin
      if (user.deactivatedBy && user.deactivatedBy.toString() !== req.admin._id.toString()) {
        console.log('❌ Admin blocked: User was deactivated by another admin');
        return res.status(403).json({ 
          message: 'Access denied. You can only reactivate users that you deactivated yourself.' 
        });
      }
    }
    
    // If we reach here, reactivation is allowed
    console.log('✅ Reactivation allowed');
    
    user.isActive = true;
    user.deactivatedBy = null;
    user.deactivatedByRole = null;
    user.deactivatedAt = null;
    user.reactivatedBy = req.admin._id;
    user.reactivatedAt = new Date();
    await user.save();
    
    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ message: 'Failed to reactivate user' });
  }
};



exports.fundUser = async (req, res) => {
  try {
    const { email, amount, accountType, description, date } = req.body;
    const adminId = req.user._id;

    console.log('Fund user request data:', { email, amount, accountType, description, date });

    // Validate required fields
    if (!email || !amount || !accountType) {
      return res.status(400).json({ 
        message: 'Missing required fields: email, amount, and accountType are required' 
      });
    }

    if (!['savings', 'current', 'loan'].includes(accountType)) {
      return res.status(400).json({ message: 'Invalid account type' });
    }

    // Validate amount
    const fundAmount = parseFloat(amount);
    if (isNaN(fundAmount) || fundAmount <= 0) {
      return res.status(400).json({ message: 'Invalid funding amount' });
    }

    const admin = await Admin.findById(adminId);
    const user = await User.findOne({ email });

    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Initialize admin wallet if undefined
    if (admin.wallet === undefined || admin.wallet === null) {
      admin.wallet = 0;
    }

    if (admin.wallet < fundAmount) {
      return res.status(400).json({ message: 'Insufficient admin wallet balance' });
    }

    // Deduct from admin wallet
    admin.wallet -= fundAmount;
    await admin.save();

    // Initialize and credit user balance
    if (!user.balances) {
      user.balances = { savings: 0, current: 0, loan: 0, inflow: 0, outflow: 0 };
    }

    user.balances[accountType] = (user.balances[accountType] || 0) + fundAmount;
    user.balances.inflow = (user.balances.inflow || 0) + fundAmount;
    await user.save();

    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Parse transaction date safely
    let transactionDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        transactionDate = parsedDate;
      }
    }

    // Create user transaction
    await Transaction.create({
      userId: user._id.toString(),
      type: 'inflow',
      transactionId,
      amount: fundAmount,
      description: description || `Funded by admin (${admin.email})`,
      accountType,
      createdAt: transactionDate
    });

    // Create admin transaction
    await Transaction.create({
      userId: admin._id.toString(),
      type: 'outflow',
      transactionId,
      amount: fundAmount,
      description: `Funded ${user.email}'s ${accountType} account`,
      accountType: 'wallet',
      createdAt: transactionDate
    });

    console.log(`✅ Admin ${admin.email} funded ${user.email} with $${fundAmount}`);

    res.json({
      message: `User ${accountType} account funded successfully from admin wallet`,
      adminNewWallet: admin.wallet,
      userNewBalance: user.balances[accountType]
    });

  } catch (error) {
    console.error('Fund user error:', error);
    console.error('Error stack:', error.stack); // Add this for more details
    res.status(500).json({ 
      message: 'Failed to fund user account',
      error: error.message // Add this temporarily to see the actual error
    });
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


exports.sendEmail = async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Send the email using your utility
    await sendEmail({
      email: user.email,
      subject: subject,
      message: message
    });
    
    // Store email in database after successful send
    await Email.create({
      senderType: req.admin.role,
      senderId: req.admin._id,
      senderEmail: req.admin.email,
      recipientEmail: user.email,
      recipientName: user.fullname,
      subject: subject,
      message: message,
      status: "sent"
    });
    
    res.json({ message: 'Email sent and logged successfully' });
  } catch (error) {
    console.error('Send email error:', error);
    
    // Log failed email attempt
    try {
      await Email.create({
        senderType: req.admin.role,
        senderId: req.admin._id,
        senderEmail: req.admin.email,
        recipientEmail: req.body.email,
        subject: req.body.subject || 'No subject',
        message: req.body.message || 'No message',
        status: "failed"
      });
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }
    
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


// Get all admins (Super Admin only)
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({ isDeleted: { $ne: true } }).select('-password');
    res.json({ admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Failed to fetch admins' });
  }
};

// Deactivate admin (Super Admin only)
exports.deactivateAdmin = async (req, res) => {
  try {
    const { email } = req.params;
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot deactivate another super admin' });
    }
    
    admin.isActive = false;
    admin.deactivatedBy = 'superadmin';
    await admin.save();
    
    res.json({ message: 'Admin deactivated successfully' });
  } catch (error) {
    console.error('Deactivate admin error:', error);
    res.status(500).json({ message: 'Failed to deactivate admin' });
  }
};

// Reactivate admin (Super Admin only)
exports.reactivateAdmin = async (req, res) => {
  try {
    const { email } = req.params;
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    admin.isActive = true;
    admin.deactivatedBy = null;
    await admin.save();
    
    res.json({ message: 'Admin reactivated successfully' });
  } catch (error) {
    console.error('Reactivate admin error:', error);
    res.status(500).json({ message: 'Failed to reactivate admin' });
  }
};

// Delete admin (Super Admin only)
exports.deleteAdmin = async (req, res) => {
  try {
    const { email } = req.params;
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete another super admin' });
    }
    
    admin.isDeleted = true;
    admin.deletedAt = new Date();
    admin.deletedBy = 'superadmin';
    await admin.save();
    
    res.json({ message: 'Admin moved to recycle bin' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Failed to delete admin' });
  }
};


// Get all sent emails (Super Admin only)
exports.getAllSentEmails = async (req, res) => {
  try {
    const emails = await Email.find()
      .sort({ sentAt: -1 })
      .populate('senderId', 'username email role');
    
    res.json({ emails });
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ message: 'Failed to fetch sent emails' });
  }
};


// @desc    Fund admin wallet (superadmin only)
exports.fundAdminWallet = async (req, res, next) => {
  try {
    const { adminId, amount } = req.body;

    if (!adminId || !amount) {
      return res.status(400).json({ message: "Admin ID and amount are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role === "superadmin") {
      return res.status(400).json({ message: "Cannot fund superadmin wallet" });
    }

    admin.wallet += parseFloat(amount);
    await admin.save();

    res.json({
      message: "Wallet funded successfully",
      admin: {
        _id: admin._id,
        username: admin.username,
        wallet: admin.wallet
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin wallet balance
exports.getAdminWallet = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    res.json({ wallet: admin.wallet });
  } catch (error) {
    next(error);
  }
};


exports.createUser = async (req, res) => {
  try {
    const { fullname, email, phone, password } = req.body;

    const adminId = req.user?._id || req.admin?._id;

    console.log('👮 Admin creating user:', { email, adminId });

    // Same validation as regular registration
    if (!fullname || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
          
    // Password length check (min 6, max 15 characters)
    if (password.length < 6 || password.length > 15) {
      return res.status(400).json({
        message: "Password must be between 6 and 15 characters long",
      });
    }

    // Enforce stronger password (at least 1 number & 1 special char)
    const strongPasswordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least 1 number and 1 special character",
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate unique account numbers
    const savingsAccountNumber = await generateUniqueAccountNumber("savingsAccountNumber");
    const currentAccountNumber = await generateUniqueAccountNumber("currentAccountNumber");

    // Create user
    const user = new User({
      fullname,
      email,
      phone,
      password,
      savingsAccountNumber,
      currentAccountNumber,
      createdBy: 'admin',
      createdByAdmin: adminId
    });

    await user.save();

    console.log('✅ User created by admin:', user.email);

    // Send welcome email
    const sendEmail = require('../utils/sendEmail'); // Adjust path if needed
    await sendEmail({ 
      email: user.email,
      subject: "🎉 Welcome to Pauls Valley Bank",
      message: `Hi ${fullname}, welcome to Pauls Valley Bank!\n
Your new account has been created by our admin team, and you now have access to all our digital banking services.\n
For your security, please keep your login details private and never share your PIN or password with anyone.\n
You can access your dashboard here: https://bank.pvbonline.online/index.html\n
If you didn't request this account, please contact our support immediately.`,
      html: `
        <div style="max-width:600px; margin:auto; padding:20px; font-family:Arial, sans-serif; border:1px solid #eaeaea; border-radius:10px;">
          <div style="text-align:center; margin-bottom:20px;">
            <img src="https://bank.pvbonline.online/image/logo.webp" alt="Pauls Valley Bank" style="max-width:150px; height:auto;" />
          </div>
          <h2 style="color:#004080; text-align:center;">Welcome to Pauls Valley Bank</h2>
          <p style="font-size:16px; color:#333;">Dear <b>${fullname}</b>,</p>
          <p style="font-size:15px; color:#555; line-height:1.6;">
            We're excited to have you on board! 🎉 <br>
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
            If you didn't register for this account, please ignore this email or contact our support immediately.
          </p>
          <hr style="margin:20px 0; border:none; border-top:1px solid #eee;" />
          <p style="font-size:12px; color:#aaa; text-align:center;">
            © ${new Date().getFullYear()} Pauls Valley Bank. All rights reserved. <br/>
            This is an automated email, please do not reply.
          </p>
        </div>
      `,
    }).catch(err => console.error('Failed to send welcome email:', err));

    res.status(201).json({
      message: 'User created successfully by admin',
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        savingsAccountNumber: user.savingsAccountNumber,
        currentAccountNumber: user.currentAccountNumber
      }
    });

  } catch (error) {
    console.error('❌ Admin create user error:', error);
    res.status(500).json({ 
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// Send email to user
// exports.sendEmail = async (req, res) => {
//   try {
//     const { email, subject, message } = req.body;
    
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
    
//     await sendEmail({
//       email: user.email,
//       subject: subject,
//       message: message
//     });
    
//     res.json({ message: 'Email sent successfully' });
//   } catch (error) {
//     console.error('Send email error:', error);
//     res.status(500).json({ message: 'Failed to send email' });
//   }
// };


// Delete user
// exports.deleteUser = async (req, res) => {
//   try {
//     const { email } = req.params;
//     const user = await User.findOneAndDelete({ email });
    
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
    
//     res.json({ message: 'User deleted successfully' });
//   } catch (error) {
//     console.error('Delete user error:', error);
//     res.status(500).json({ message: 'Failed to delete user' });
//   }
// };

// exports.deactivateUser = async (req, res) => {
//   try {
//     const { email } = req.params;
//     const user = await User.findOneAndUpdate(
//       { email }, 
//       { isActive: false },
//       { new: true }
//     );
    
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
    
//     res.json({ message: 'User deactivated successfully' });
//   } catch (error) {
//     console.error('Deactivate user error:', error);
//     res.status(500).json({ message: 'Failed to deactivate user' });
//   }
// };

// // Add reactivation function
// exports.reactivateUser = async (req, res) => {
//   try {
//     const { email } = req.params;
//     const user = await User.findOneAndUpdate(
//       { email }, 
//       { isActive: true },
//       { new: true }
//     );
    
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
    
//     res.json({ message: 'User reactivated successfully' });
//   } catch (error) {
//     console.error('Reactivate user error:', error);
//     res.status(500).json({ message: 'Failed to reactivate user' });
//   }
// };
