// controllers/cardController.js
const Card = require('../models/Card');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');


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

// Admin fund card directly for user
exports.adminFundCard = async (req, res) => {
  try {
    const { userEmail, amount } = req.body;

    console.log('💰 Fund card request:', { userEmail, amount });

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Find user
    const user = await User.findOne({ email: userEmail });
    console.log('👤 User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find user's card
    const card = await Card.findOne({ userId: user._id });
    console.log('💳 Card found:', card ? 'YES' : 'NO');
    
    if (!card) {
      return res.status(404).json({ message: 'User does not have a card' });
    }

    // Check if card is active
    if (!card.isActive || card.status !== 'approved') {
      return res.status(400).json({ 
        message: `Card is not active (Status: ${card.status}, Active: ${card.isActive})` 
      });
    }

    // Update balance
    const previousBalance = card.cardBalance;
    card.cardBalance += parseFloat(amount);
    await card.save();

    console.log('✅ Card funded successfully');
    console.log(`Previous: $${previousBalance} → New: $${card.cardBalance}`);

    res.status(200).json({
      message: 'Card funded successfully',
      previousBalance: previousBalance,
      newBalance: card.cardBalance,
      amountAdded: parseFloat(amount)
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

    // Map cards to include message for deactivated ones
    const responseCards = cards.map(card => {
      return {
        _id: card._id,
        cardHolderName: card.cardHolderName,
        cardType: card.cardType,
        cardNumber: card.cardNumber,
        cvv: card.cvv,
        expiryDate: card.expiryDate,
        cardBalance: card.cardBalance ?? 0,
        isActive: card.isActive,
        statusMessage: card.isActive
          ? null
          : 'Your card has been deactivated, please contact customer care.'
      };
    });

    res.json(responseCards);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ message: "Error fetching cards" });
  }
};


// controllers/cardController.js
exports.fundCard = async (req, res) => {
  try {
    const { cardId, amount, source } = req.body; // source = "savings" or "current"
    const amountNum = Number(amount);

    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const user = req.user;

    const card = await Card.findOne({ _id: cardId, userId: user._id });
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Default to "current" if not provided
    const fundSource = source || "current";

    if (!["savings", "current"].includes(fundSource)) {
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




