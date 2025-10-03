// controllers/cardController.js
const Card = require('../models/Card');
const User = require('../models/User');

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

// Admin creates card directly for user
exports.adminCreateCard = async (req, res) => {
  try {
    const { userEmail, cardHolderName, cardType, cardNumber, cvv, expiryDate, transactionPin } = req.body;

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a card
    const existingCard = await Card.findOne({ userId: user._id });
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
      status: 'approved', // Admin-created cards are auto-approved
      isActive: true,
      createdBy: 'admin',
      approvedBy: req.user._id, // Admin who created it
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


// GET all cards of logged-in user
exports.getMyCards = async (req, res) => {
  try {
    const cards = await Card.find({ userId: req.user.id });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: "Error fetching cards" });
  }
};

// Fund a card from main balance
exports.fundCard = async (req, res) => {
  try {
    const { cardId, amount } = req.body;
    const user = await User.findById(req.user.id);
    const card = await Card.findOne({ _id: cardId, userId: req.user.id });

    if (!card) return res.status(404).json({ message: "Card not found" });
    if (user.mainBalance < amount) return res.status(400).json({ message: "Insufficient funds" });

    user.mainBalance -= amount;
    card.cardBalance += amount;

    await user.save();
    await card.save();

    res.json({ message: "Card funded successfully", card });
  } catch (err) {
    res.status(500).json({ message: "Error funding card" });
  }
};
