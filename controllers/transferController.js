// controllers/transactionController.js
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const bcrypt = require("bcryptjs");
const { Parser } = require("json2csv");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Account = require("../models/Account"); // Add this line
const admin = require("../models/Admin")

// @route   POST /api/transactions/transfer


exports.transfer = async (req, res) => {
  try {
    const {
      amount,
      accountNumber,
      bank,
      country,
      pin,
      fromAccountType = "savings",
      toAccountType = "current"
    } = req.body;

    // Validate required fields
    if (!amount || !accountNumber || !pin) {
      return res.status(400).json({ 
        message: "Missing required fields: amount, accountNumber, or PIN" 
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: "Transfer amount must be greater than 0" });
    }

    // Validate account types
    const validTypes = ["savings", "current"];
    if (!validTypes.includes(fromAccountType) || !validTypes.includes(toAccountType)) {
      return res.status(400).json({ message: "Invalid account type" });
    }

    // Find sender
    const sender = await User.findById(req.user.id).select("+transactionPin");
      console.log("Transfer debug:", {
       userId: req.user.id,
       senderExists: !!sender,
       pinExists: !!sender?.transactionPin,
       pinLength: sender?.transactionPin?.length,
  // Add these new debug fields
       receivedPin: pin,
       receivedPinType: typeof pin,
       receivedPinValue: `'${pin}'`
       });

          

    if (!sender) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has a PIN set
    if (!sender.transactionPin) {
      return res.status(400).json({ 
        message: "Please set up your transaction PIN first",
        requiresPinSetup: true 
      });
    }

    // Verify PIN
    const pinString = String(pin).trim();
    const isPinValid = await sender.matchPin(pinString);

    console.log("PIN Comparison:", {
    pinAsString: pinString,
    comparisonResult: isPinValid
    });

    if (!isPinValid) {
   return res.status(400).json({ message: "Invalid transaction PIN" });
   }

    // Check balance
    if (sender.balances[fromAccountType] < amount) {
      return res.status(400).json({ 
        message: `Insufficient balance in ${fromAccountType} account. Available: $${sender.balances[fromAccountType]}` 
      });
    }

    // Find recipient (check both account types)
    const recipient = await User.findOne({
      $or: [
        { savingsAccountNumber: accountNumber },
        { currentAccountNumber: accountNumber }
      ]
    });

    if (!recipient) {
      return res.status(404).json({ 
        message: "Recipient account not found. Please verify the account number." 
      });
    }

    // Prevent self-transfer
    if (sender._id.toString() === recipient._id.toString()) {
      return res.status(400).json({ message: "Cannot transfer to your own account" });
    }

    // Perform transfer
    sender.balances[fromAccountType] -= amount;
    sender.balances.outflow += amount;

    recipient.balances[toAccountType] += amount;
    recipient.balances.inflow += amount;

    // Save users
    await sender.save();
    await recipient.save();

    // Create transaction records
    await Transaction.create({
      userId: sender._id,
      type: "outflow",
      amount,
      description: `Transfer to ${accountNumber} (${bank || 'Unknown Bank'}, ${country || 'Unknown Country'})`,
      accountType: fromAccountType,
      balanceAfter: sender.balances[fromAccountType],
      recipientAccount: accountNumber,
      status: "completed"
    });

    await Transaction.create({
      userId: recipient._id,
      type: "inflow",
      amount,
      description: `Transfer from ${sender.fullname} (${sender.currentAccountNumber})`,
      accountType: toAccountType,
      balanceAfter: recipient.balances[toAccountType],
      senderAccount: fromAccountType === "savings" ? sender.savingsAccountNumber : sender.currentAccountNumber,
      status: "completed"
    });

    // Mask account number for response
    const maskedAccount = accountNumber.slice(0, 4) + "****" + accountNumber.slice(-2);

    res.status(200).json({
      success: true,
      message: `Transfer of $${amount} to ${maskedAccount} can not be completed at the moment, please contact customer care via live chat or email. Thank you`,
      balances: sender.balances,
      transactionId: crypto.randomUUID()
    });

  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({ message: "Transfer failed. Please try again." });
  }
};



// Set up transaction PIN
exports.createPin = async (req, res) => {
  try {
    const { pin, confirmPin } = req.body;

    if (!pin || !confirmPin) {
      return res.status(400).json({ message: "PIN and confirmation required" });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({ message: "PIN and confirmation do not match" });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be exactly 4 digits" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the PIN
    // const hashedPin = await bcrypt.hash(pin, 12);
    user.transactionPin = pin;
    // user.transactionPin = hashedPin;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Transaction PIN set successfully"
    });

  } catch (error) {
    console.error("Create PIN error:", error);
    res.status(500).json({ message: "Failed to create PIN" });
  }
};

// Request PIN reset
exports.forgotPin = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a plain reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token before saving to DB (same pattern as password reset)
    user.pinResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.pinResetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Create reset URL (frontend link)
    const resetUrl = `${process.env.FRONTEND_URL}/userpage.html?pinResetToken=${resetToken}`;

    // Send email (assuming you have the same sendEmail function)
    await sendEmail({
      email: user.email,
      subject: "PVNBank PIN Reset Request",
      message: `You requested a PIN reset. Click here to reset your transaction PIN:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.`,
    });

    res.status(200).json({
      success: true,
      message: "PIN reset instructions sent to your email"
    });

  } catch (error) {
    console.error("Forgot PIN error:", error);
    res.status(500).json({ message: "Failed to process PIN reset request" });
  }
};



// Reset PIN with token
exports.resetPin = async (req, res) => {
  try {
    const { token, newPin, confirmPin } = req.body;

    if (!token || !newPin || !confirmPin) {
      return res.status(400).json({ message: "Token and new PIN required" });
    }

    if (newPin !== confirmPin) {
      return res.status(400).json({ message: "PIN and confirmation do not match" });
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: "PIN must be exactly 4 digits" });
    }

    // Hash the token to match what's stored in DB (same as forgotPin function)
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    console.log("Token Debug:", {
      receivedToken: token,
      hashedToken: hashedToken,
      currentTime: Date.now()
    });

    const user = await User.findOne({
      pinResetToken: hashedToken,  // Use hashed token
      pinResetTokenExpiry: { $gt: Date.now() }  // Use Date.now() instead of new Date()
    });

    console.log("User found:", !!user);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new PIN with string conversion
    // const hashedPin = await bcrypt.hash(String(newPin), 12);
    user.transactionPin = newPin; // Don't hash it manually
    // user.transactionPin = hashedPin;
    user.pinResetToken = undefined;
    user.pinResetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "PIN reset successfully"
    });

  } catch (error) {
    console.error("Reset PIN error:", error);
    res.status(500).json({ message: "Failed to reset PIN" });
  }
};


// exports.getTransactionHistory = async (req, res) => {
//   try {
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ 
//         message: "User not authenticated or user ID missing" 
//       });
//     }

//     const { start, end } = req.query;

//     // Build filter to find transactions for this user
//     const filter = { userId: req.user.id };
    
//     if (start && end) {
//       filter.createdAt = {
//         $gte: new Date(start),
//         $lte: new Date(new Date(end).setHours(23, 59, 59))
//       };
//     }

//     const transactions = await Transaction.find(filter).sort({ createdAt: -1 });

//     console.log('Found transactions:', transactions.length);
//     res.json(transactions);
//   } catch (err) {
//     console.error("Error fetching history:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

exports.getTransactionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
      
    res.json(transactions);
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ message: 'Failed to load transaction history' });
  }
};
// @desc    Download transaction statement (CSV)
// @route   GET /api/transactions/statement?start=YYYY-MM-DD&end=YYYY-MM-DD
// @access  Private
exports.downloadStatement = async (req, res) => {
  try {
    const { start, end } = req.query;

    const filter = { userId: req.user.id };
    if (start && end) {
      filter.createdAt = {
        $gte: new Date(start),
        $lte: new Date(new Date(end).setHours(23, 59, 59))
      };
    }

    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });

    if (transactions.length === 0) {
      return res.status(404).json({ message: "No transactions found" });
    }

    // Prepare CSV fields
    const fields = [
      { label: "Date", value: row => new Date(row.createdAt).toLocaleString() },
      { label: "Description", value: "description" },
      { label: "Amount", value: "amount" },
      { label: "Type", value: "type" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(transactions);

    res.header("Content-Type", "text/csv");
    res.attachment("statement.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Error generating statement:", err);
    res.status(500).json({ message: "Server error" });
  }
};


