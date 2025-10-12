// controllers/cardController.js
const Card = require('../models/Card');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const bcrypt = require('bcryptjs'); 
const Admin = require('../models/Admin');
const crypto = require('crypto');
const sendEmail = require("../utils/sendEmail");


// Generate token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};



// User creates card application
exports.createCardApplication = async (req, res) => {
  try {
    const { cardHolderName, cardType, cardNumber, cvv, expiryDate, transactionPin } = req.body;
    const userId = req.user._id;

    // Check for active cards only (exclude rejected)
      const existingActiveCard = await Card.findOne({ 
       userId: userId,
       status: { $ne: 'rejected' } // Not rejected
      });

      if (existingActiveCard) {
      return res.status(400).json({ 
      message: `You already have a ${existingActiveCard.status} card application.` 
      });
     }

    // Validate PIN
    if (!transactionPin || transactionPin.length !== 4) {
      return res.status(400).json({ message: 'Transaction PIN must be 4 digits' });
    }

    const card = new Card({
      userId,
      cardHolderName,
      cardType,
      cardNumber: cardNumber.replace(/\s/g, ''),
      cvv,
      expiryDate,
      transactionPin,
      status: 'pending',
      createdBy: 'user'
    });

    await card.save();

    res.status(201).json({
      message: 'Card application submitted successfully. Pending admin approval.',
      cardId: card._id
    });

  } catch (error) {
    console.error('Create card application error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Card number already exists' });
    }
    res.status(500).json({ message: 'Failed to submit card application' });
  }
};



// User views their card
exports.getUserCard = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const card = await Card.findOne({ userId }).select('-transactionPin');
    
    if (!card) {
      return res.status(404).json({ message: 'No card found' });
    }

    res.json({ card });

  } catch (error) {
    console.error('Get user card error:', error);
    res.status(500).json({ message: 'Failed to retrieve card' });
  }
};

exports.adminFundCard = async (req, res) => {
  try {
    const { userEmail, amount } = req.body;
    const adminId = req.admin._id; // ✅ fixed: match your middleware

    console.log('💰 Fund card request:', { userEmail, amount, adminId });

    const fundAmount = parseFloat(amount);
    if (!fundAmount || fundAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const admin = await Admin.findById(adminId);
    const user = await User.findOne({ email: userEmail });

    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const card = await Card.findOne({ userId: user._id });
    if (!card) return res.status(404).json({ message: 'User does not have a card' });

    if (!card.isActive || card.status !== 'approved') {
      return res.status(400).json({
        message: `Card is not active (Status: ${card.status}, Active: ${card.isActive})`
      });
    }

    // ✅ Ensure admin has enough wallet balance
    if (admin.wallet < fundAmount) {
      return res.status(400).json({ message: 'Insufficient admin wallet balance' });
    }

    // ✅ Deduct from admin wallet
    const adminPreviousWallet = admin.wallet;
    admin.wallet -= fundAmount;
    await admin.save();

    // ✅ Credit user's card
    const previousBalance = card.cardBalance;
    card.cardBalance += fundAmount;
    await card.save();

    // ✅ Record transactions
    const transactionId = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const transactionDate = new Date();

    await Transaction.create({
      userId: user._id,
      type: 'inflow',
      transactionId,
      amount: fundAmount,
      description: `Card funded by admin (${admin.email})`,
      accountType: 'card',
      createdAt: transactionDate
    });

    await Transaction.create({
      userId: admin._id,
      type: 'outflow',
      transactionId,
      amount: fundAmount,
      description: `Funded ${user.email}'s card`,
      accountType: 'wallet',
      createdAt: transactionDate
    });

    res.status(200).json({
      message: 'Card funded successfully from admin wallet',
      amountAdded: fundAmount,
      previousCardBalance: previousBalance,
      newCardBalance: card.cardBalance,
      adminPreviousWallet,
      adminNewWallet: admin.wallet
    });

  } catch (error) {
    console.error('❌ Admin fund card error:', error);
    res.status(500).json({ message: 'Failed to fund card', error: error.message });
  }
};


exports.adminCreateCard = async (req, res) => {
  try {
    const { userEmail, cardHolderName, cardType, cardNumber, cvv, expiryDate, transactionPin } = req.body;

    console.log('📧 Searching for user with email:', userEmail);

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    
    console.log('👤 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('User ID:', user._id);
      console.log('User email in DB:', user.email);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a card
    const existingCard = await Card.findOne({ userId: user._id });
    console.log('💳 Existing card:', existingCard ? 'YES' : 'NO');
    
    if (existingCard) {
      return res.status(400).json({ 
        message: 'User already has a card. Only one card per user is allowed.' 
      });
    }

    // Validate PIN
    if (!transactionPin || transactionPin.length !== 4) {
      return res.status(400).json({ message: 'Transaction PIN must be 4 digits' });
    }

    const card = new Card({
      userId: user._id,
      cardHolderName,
      cardType,
      cardNumber: cardNumber.replace(/\s/g, ''),
      cvv,
      expiryDate,
      transactionPin,
      status: 'approved',
      isActive: true,
      createdBy: 'admin',
      approvedBy: req.admin._id,
      approvedAt: new Date()
    });

    await card.save();

    res.status(201).json({
      message: 'Card created successfully for user',
      cardId: card._id
    });

  } catch (error) {
    console.error('Admin create card error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Card number already exists' });
    }
    res.status(500).json({ message: 'Failed to create card' });
  }
};

// Admin gets all pending card applications
exports.getPendingCards = async (req, res) => {
  try {
    const pendingCards = await Card.find({ status: 'pending' })
      .populate('userId', 'fullname email')
      .select('-transactionPin')
      .sort({ createdAt: -1 });

    res.json({ pendingCards });

  } catch (error) {
    console.error('Get pending cards error:', error);
    res.status(500).json({ message: 'Failed to retrieve pending cards' });
  }
};

// Admin approves card application
exports.approveCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (card.status !== 'pending') {
      return res.status(400).json({ message: 'Card is not pending approval' });
    }

    card.status = 'approved';
    card.isActive = true;
    card.approvedBy = req.admin._id; // Changed from req.user._id to req.admin._id
    card.approvedAt = new Date();

    await card.save();

    res.json({ message: 'Card approved successfully' });

  } catch (error) {
    console.error('Approve card error:', error);
    res.status(500).json({ message: 'Failed to approve card' });
  }
};
// Admin rejects card application
exports.rejectCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { reason } = req.body;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (card.status !== 'pending') {
      return res.status(400).json({ message: 'Card is not pending approval' });
    }

    card.status = 'rejected';
    card.rejectedAt = new Date();
    card.rejectionReason = reason || 'No reason provided';

    await card.save();

    res.json({ message: 'Card rejected successfully' });

  } catch (error) {
    console.error('Reject card error:', error);
    res.status(500).json({ message: 'Failed to reject card' });
  }
};

// Admin deactivates card
exports.deactivateCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (card.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved cards can be deactivated' });
    }

    card.isActive = false;
    await card.save();

    res.json({ message: 'Card deactivated successfully' });

  } catch (error) {
    console.error('Deactivate card error:', error);
    res.status(500).json({ message: 'Failed to deactivate card' });
  }
};

// Admin reactivates card
exports.reactivateCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (card.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved cards can be reactivated' });
    }

    card.isActive = true;
    await card.save();

    res.json({ message: 'Card reactivated successfully' });

  } catch (error) {
    console.error('Reactivate card error:', error);
    res.status(500).json({ message: 'Failed to reactivate card' });
  }
};

// Admin gets all cards with filters
exports.getAllCards = async (req, res) => {
  try {
    const { status, isActive, cardType } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (cardType) filter.cardType = cardType;

    const cards = await Card.find(filter)
      .populate('userId', 'fullname email')
      .select('-transactionPin')
      .sort({ createdAt: -1 });

    res.json({ cards });

  } catch (error) {
    console.error('Get all cards error:', error);
    res.status(500).json({ message: 'Failed to retrieve cards' });
  }
};


// GET /api/users/my-cards
exports.getMyCards = async (req, res) => {
  try {
    const cards = await Card.find({ userId: req.user.id }).select('-transactionPin');

    const responseCards = cards.map(card => {
      let statusMessage = null;

      if (!card.isApproved) {
        statusMessage = "Your card is not yet approved by the Bank.";
      } else if (!card.isActive) {
        statusMessage = "Your card has been deactivated, please contact customer care.";
      }

      return {
        _id: card._id,
        cardHolderName: card.cardHolderName,
        cardType: card.cardType,
        cardNumber: card.cardNumber,
        cvv: card.cvv,
        expiryDate: card.expiryDate,
        cardBalance: card.cardBalance ?? 0,
        isActive: card.isActive,
        isApproved: card.isApproved,
        statusMessage
      };
    });

    res.json(responseCards);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ message: "Error fetching cards" });
  }
};

// controllers/cardController.js
// exports.fundCard = async (req, res) => {
//   try {
//     const { cardId, amount, source } = req.body; // source = "savings" or "current"
//     const amountNum = Number(amount);

//     if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
//       return res.status(400).json({ message: "Invalid amount" });
//     }

//     const user = req.user;

//     const card = await Card.findOne({ _id: cardId, userId: user._id });
//     if (!card) {
//       return res.status(404).json({ message: "Card not found" });
//     }

//     // Default to "current" if not provided
//     const fundSource = source || "current";

//     if (!["savings", "current", "loan"].includes(fundSource)) {
//       return res.status(400).json({ message: "Invalid source account" });
//     }

//     if (Number(user.balances[fundSource]) < amountNum) {
//       return res.status(400).json({ message: `Insufficient funds in ${fundSource}` });
//     }

//     // Deduct from source & fund card
//     user.balances[fundSource] = Number(user.balances[fundSource]) - amountNum;
//     card.cardBalance = Number(card.cardBalance) + amountNum;

//     await user.save();
//     await card.save();

//     res.json({
//       message: `Card funded successfully from ${fundSource}`,
//       card,
//       remainingBalance: user.balances[fundSource],
//     });
//   } catch (err) {
//     console.error("❌ Fund Card Error:", err);
//     res.status(500).json({ message: "Error funding card", error: err.message });
//   }
// };
exports.fundCard = async (req, res) => {
  try {
    const { cardId, amount, source, pin } = req.body; // ← Add 'pin' here
    const amountNum = Number(amount);

    // Validate amount
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Validate PIN is provided
    if (!pin) {
      return res.status(400).json({ message: "PIN is required" });
    }

    const user = req.user;

    // ✅ VERIFY TRANSFER PIN
    if (!user.transferPin) {
      return res.status(400).json({ message: "Please create a transfer PIN first" });
    }

    const bcrypt = require('bcryptjs'); // Make sure bcrypt is imported at the top
    const isPinValid = await bcrypt.compare(pin, user.transferPin);
    
    if (!isPinValid) {
      return res.status(401).json({ message: "Invalid PIN. Transaction denied." });
    }

    // Find card
    const card = await Card.findOne({ _id: cardId, userId: user._id });
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Default to "current" if not provided
    const fundSource = source || "current";

    if (!["savings", "current", "loan"].includes(fundSource)) {
      return res.status(400).json({ message: "Invalid source account" });
    }

    if (Number(user.balances[fundSource]) < amountNum) {
      return res.status(400).json({ message: `Insufficient funds in ${fundSource}` });
    }

    // Deduct from source & fund card
    user.balances[fundSource] = Number(user.balances[fundSource]) - amountNum;
    card.cardBalance = Number(card.cardBalance) + amountNum;

    await user.save();
    await card.save();

    res.json({
      message: `Card funded successfully from ${fundSource}`,
      card,
      remainingBalance: user.balances[fundSource],
    });
  } catch (err) {
    console.error("❌ Fund Card Error:", err);
    res.status(500).json({ message: "Error funding card", error: err.message });
  }
};

exports.cardPurchase = async (req, res) => {
  try {
    console.log('🔍 Card Purchase Request:', {
      body: req.body,
      userId: req.user._id
    });

    const { cardId, pin, amount, items, deliveryAddress } = req.body;

    // Find card
    const card = await Card.findById(cardId);
    console.log('💳 Card found:', card ? 'Yes' : 'No');

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Verify card belongs to user
    if (card.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized access to card' });
    }

    // Check if card is approved and active
    if (card.status !== 'approved' || !card.isActive) {
      return res.status(400).json({ message: 'Card is not active or approved' });
    }

    // Verify PIN
    const isPinValid = await card.matchPin(pin);
    console.log('🔑 PIN valid:', isPinValid);

    if (!isPinValid) {
      return res.status(401).json({ message: 'Incorrect PIN' });
    }

    // Check balance - FIXED: Use cardBalance instead of balance
    console.log('💰 Card balance:', card.cardBalance, 'Required:', amount);
    
    if (card.cardBalance < amount) {
      return res.status(400).json({ message: 'Insufficient card balance' });
    }

    // Deduct amount from card - FIXED: Use cardBalance
    card.cardBalance -= amount;
    await card.save();

    // Create transaction record - FIXED: Use 'outflow' type
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'outflow', // ✅ Changed from 'purchase' to 'outflow'
      amount: amount,
      description: `Memart purchase - ${items.length} item(s) | Address: ${deliveryAddress}`
    });
    await transaction.save();

    console.log('✅ Transaction completed');

    res.json({ 
      message: 'Payment successful',
      transactionId: transaction._id,
      newBalance: card.cardBalance,
      orderDetails: {
        items: items.length,
        totalAmount: amount,
        deliveryAddress: deliveryAddress
      }
    });

  } catch (error) {
    console.error('❌ Card purchase error:', error);
    res.status(500).json({ 
      message: 'Payment processing failed',
      error: error.message
    });
  }
};



exports.forgotCardPin = async (req, res) => {
  try {
    const { cardNumber } = req.body;
    const userId = req.user._id;

    const card = await Card.findOne({ userId, cardNumber });
    if (!card) return res.status(404).json({ message: "Card not found" });

    // Generate secure reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and set expiry (15 mins)
    card.resetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    card.resetTokenExpiry = Date.now() + 15 * 60 * 1000; 
    await card.save({ validateBeforeSave: false });

    // Reset link
    const resetUrl = `${process.env.FRONTEND_URL}/memert.html?resetCardPinToken=${resetToken}&card=${cardNumber}`;


    const html = `
      <div style="max-width:600px; margin:auto; padding:20px; font-family:Arial, sans-serif; border:1px solid #eaeaea; border-radius:10px;">
        <div style="text-align:center; margin-bottom:20px;">
          <img src="https://bank.pvbonline.online/image/logo.webp" alt="Pauls Valley Bank" style="max-width:150px; height:auto;" />
        </div>
        <h2 style="color:#004080; text-align:center;">Reset Your Card PIN</h2>
        <p style="font-size:16px; color:#333;">Hello <b>${req.user.fullname || "User"}</b>,</p>
        <p style="font-size:15px; color:#555; line-height:1.6;">
          We received a request to reset the PIN for your card ending with <b>${cardNumber.slice(-4)}</b>.
        </p>
        <p style="font-size:15px; color:#555; line-height:1.6;">
          Click the button below to set a new PIN. This link will expire in <b>15 minutes</b>.
        </p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${resetUrl}" 
             style="background-color:#004080; color:#fff; padding:12px 24px; text-decoration:none; border-radius:5px; font-weight:bold;">
            Reset Card PIN
          </a>
        </div>
        <p style="font-size:14px; color:#777; text-align:center;">
          If you did not request this, you can safely ignore this email.
        </p>
        <hr style="margin:20px 0; border:none; border-top:1px solid #eee;" />
        <p style="font-size:12px; color:#aaa; text-align:center;">
          © ${new Date().getFullYear()} Pauls Valley Bank. All rights reserved. <br/>
          This is an automated email, please do not reply.
        </p>
      </div>
    `;

    await sendEmail({
      email: req.user.email,
      subject: "🔐 Reset Your Card PIN - Pauls Valley Bank",
      html,
    });

    res.status(200).json({ message: "✅ PIN reset link sent to your email" });

  } catch (error) {
    console.error("Forgot Card PIN error:", error);
    res.status(500).json({ message: "Failed to send PIN reset email" });
  }
};
// ====== Reset PIN ======
exports.resetCardPin = async (req, res) => {
    try {
        const { cardNumber, newPin, token } = req.body;
        const userId = req.user._id;

        if (!newPin || newPin.length !== 4) {
            return res.status(400).json({ message: 'Transaction PIN must be 4 digits' });
        }

        const card = await Card.findOne({
            userId,
            cardNumber,
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() } // token valid
        });

        if (!card) return res.status(400).json({ message: 'Invalid or expired reset token' });

        // Update PIN and remove reset token
        card.transactionPin = newPin;
        card.resetToken = undefined;
        card.resetTokenExpiry = undefined;
        await card.save();

        res.json({ message: '✅ PIN has been reset successfully!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to reset PIN' });
    }
};