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
const sendTransactionEmail = require("../utils/sendTransactionEmail");



const fs = require('fs');
const path = require('path');

// Database file path
const DATA_FILE = path.join(__dirname, '../transactions-data.json');

// Database object
let database = {
    transactions: [],
    nextId: 1
};

// Load database
function loadDatabase() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            database = JSON.parse(data);
        } else {
            saveDatabase();
        }
    } catch (error) {
        console.error('Error loading transactions database:', error);
    }
}

// Save database
function saveDatabase() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(database, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving transactions database:', error);
    }
}

// Initialize database
loadDatabase();

// @route   POST /api/transactions/transfer


// exports.transfer = async (req, res) => {
//   try {
//     const {
//       amount,
//       accountNumber,
//       bank,
//       country,
//       pin,
//       fromAccountType = "savings",
//       toAccountType = "current"
//     } = req.body;

//     // Validate required fields
//     if (!amount || !accountNumber || !pin) {
//       return res.status(400).json({ 
//         message: "Missing required fields: amount, accountNumber, or PIN" 
//       });
//     }

//     // Validate amount
//     if (amount <= 0) {
//       return res.status(400).json({ message: "Transfer amount must be greater than 0" });
//     }

//     // Validate account types
//     const validTypes = ["savings", "current"];
//     if (!validTypes.includes(fromAccountType) || !validTypes.includes(toAccountType)) {
//       return res.status(400).json({ message: "Invalid account type" });
//     }

//     // Find sender
//     const sender = await User.findById(req.user.id).select("+transactionPin");
//       console.log("Transfer debug:", {
//        userId: req.user.id,
//        senderExists: !!sender,
//        pinExists: !!sender?.transactionPin,
//        pinLength: sender?.transactionPin?.length,
//   // Add these new debug fields
//        receivedPin: pin,
//        receivedPinType: typeof pin,
//        receivedPinValue: `'${pin}'`
//        });

          

//     if (!sender) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if user has a PIN set
//     if (!sender.transactionPin) {
//       return res.status(400).json({ 
//         message: "Please set up your transaction PIN first",
//         requiresPinSetup: true 
//       });
//     }

//     // Verify PIN
//     const pinString = String(pin).trim();
//     const isPinValid = await sender.matchPin(pinString);

//     console.log("PIN Comparison:", {
//     pinAsString: pinString,
//     comparisonResult: isPinValid
//     });

//     if (!isPinValid) {
//    return res.status(400).json({ message: "Invalid transaction PIN" });
//    }

//     // Check balance
//     if (sender.balances[fromAccountType] < amount) {
//       return res.status(400).json({ 
//         message: `Insufficient balance in ${fromAccountType} account. Available: $${sender.balances[fromAccountType]}` 
//       });
//     }

//     // Find recipient (check both account types)
//     const recipient = await User.findOne({
//       $or: [
//         { savingsAccountNumber: accountNumber },
//         { currentAccountNumber: accountNumber }
//       ]
//     });

//     if (!recipient) {
//       return res.status(404).json({ 
//         message: "Recipient account not found. Please verify the account number." 
//       });
//     }

//     // Prevent self-transfer
//     if (sender._id.toString() === recipient._id.toString()) {
//       return res.status(400).json({ message: "Cannot transfer to your own account" });
//     }

//     // Perform transfer
//     sender.balances[fromAccountType] -= amount;
//     sender.balances.outflow += amount;

//     recipient.balances[toAccountType] += amount;
//     recipient.balances.inflow += amount;

//     // Save users
//     await sender.save();
//     await recipient.save();

//     // Create transaction records
//     await Transaction.create({
//       userId: sender._id,
//       type: "outflow",
//       amount,
//       description: `Transfer to ${accountNumber} (${bank || 'Unknown Bank'}, ${country || 'Unknown Country'})`,
//       accountType: fromAccountType,
//       balanceAfter: sender.balances[fromAccountType],
//       recipientAccount: accountNumber,
//       status: "completed"
//     });

//     await Transaction.create({
//       userId: recipient._id,
//       type: "inflow",
//       amount,
//       description: `Transfer from ${sender.fullname} (${sender.currentAccountNumber})`,
//       accountType: toAccountType,
//       balanceAfter: recipient.balances[toAccountType],
//       senderAccount: fromAccountType === "savings" ? sender.savingsAccountNumber : sender.currentAccountNumber,
//       status: "completed"
//     });

//     // Mask account number for response
//     const maskedAccount = accountNumber.slice(0, 4) + "****" + accountNumber.slice(-2);

//     res.status(200).json({
//       success: true,
//       message: `Transfer of $${amount} to ${maskedAccount} can not be completed at the moment, please contact customer care via live chat or email. Thank you`,
//       balances: sender.balances,
//       transactionId: crypto.randomUUID()
//     });

//   } catch (error) {
//     console.error("Transfer error:", error);
//     res.status(500).json({ message: "Transfer failed. Please try again." });
//   }
// };

exports.transfer = async (req, res) => {
  try {
    const {
      amount,
      accountNumber,
      bank,
      country,
      pin,
      fromAccountType = "savings",
      toAccountType = "current",
    } = req.body;

    // Validate required fields
    if (!amount || !accountNumber || !pin) {
      return res.status(400).json({
        message: "Missing required fields: amount, accountNumber, or PIN",
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res
        .status(400)
        .json({ message: "Transfer amount must be greater than 0" });
    }

    // Validate account types
    const validTypes = ["savings", "current"];
    if (
      !validTypes.includes(fromAccountType) ||
      !validTypes.includes(toAccountType)
    ) {
      return res.status(400).json({ message: "Invalid account type" });
    }

    // Find sender
    const sender = await User.findById(req.user.id).select("+transactionPin");
    if (!sender) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has a PIN set
    if (!sender.transactionPin) {
      return res.status(400).json({
        message: "Please set up your transaction PIN first",
        requiresPinSetup: true,
      });
    }

    // Verify PIN
    const pinString = String(pin).trim();
    const isPinValid = await sender.matchPin(pinString);
    if (!isPinValid) {
      return res.status(400).json({ message: "Invalid transaction PIN" });
    }

    // Check balance
    if (sender.balances[fromAccountType] < amount) {
      return res.status(400).json({
        message: `Insufficient balance in ${fromAccountType} account. Available: $${sender.balances[fromAccountType]}`,
      });
    }

    // Find recipient (check both account types)
    const recipient = await User.findOne({
      $or: [
        { savingsAccountNumber: accountNumber },
        { currentAccountNumber: accountNumber },
      ],
    });

    if (!recipient) {
      return res.status(404).json({
        message: "Your transfer is unsuccessful due to transaction restriction. Please contact customer care for resolution.",
      });
    }

    // Prevent self-transfer
    if (sender._id.toString() === recipient._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot transfer to your own account" });
    }

    // Perform transfer
    sender.balances[fromAccountType] -= amount;
    sender.balances.outflow += amount;

    recipient.balances[toAccountType] += amount;
    recipient.balances.inflow += amount;

    await sender.save();
    await recipient.save();

    // Create transactions
    await Transaction.create({
      userId: sender._id,
      type: "outflow",
      amount,
      description: `Transfer to ${accountNumber} (${bank || "Unknown Bank"}, ${
        country || "Unknown Country"
      })`,
      accountType: fromAccountType,
      balanceAfter: sender.balances[fromAccountType],
      recipientAccount: accountNumber,
      status: "pending_review",
    });

    await Transaction.create({
      userId: recipient._id,
      type: "inflow",
      amount,
      description: `Transfer from ${sender.fullname} (${
        sender.currentAccountNumber
      })`,
      accountType: toAccountType,
      balanceAfter: recipient.balances[toAccountType],
      senderAccount:
        fromAccountType === "savings"
          ? sender.savingsAccountNumber
          : sender.currentAccountNumber,
      status: "pending_review",
    });

    // Mask account number for response
    const maskedAccount =
      accountNumber.slice(0, 4) + "****" + accountNumber.slice(-2);

    // 📨 Send email notifications
    await sendTransactionEmail({
      userId: sender._id,
      type: "outflow",
      amount,
      balance: sender.balances[fromAccountType],
      description: `Transfer of $${amount.toLocaleString()} to ${maskedAccount} was successful. Please contact support if this wasn't initiated by you.`,
    });

    await sendTransactionEmail({
      userId: recipient._id,
      type: "inflow",
      amount,
      balance: recipient.balances[toAccountType],
      description: `A pending transfer of $${amount.toLocaleString()} from ${sender.fullname} (${sender.email}) has been initiated. Please await confirmation.`,
    });

    // ✅ Response
    res.status(200).json({
      success: true,
      message: `Transfer of $${amount.toLocaleString()} to ${maskedAccount} has been send succesfully. if you didnt initiatite this transaction, Please contact customer care via live chat or email. Thank you.`,
      balances: sender.balances,
      transactionId: crypto.randomUUID(),
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
// controllers/authController.js (or wherever you have forgotPin)
exports.forgotPin = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a plain reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token before saving to DB
    user.pinResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.pinResetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Create reset URL (frontend link)
    const resetUrl = `${process.env.FRONTEND_URL}/userpage.html?pinResetToken=${resetToken}`;

    // Send styled email
   await sendEmail({
  email: user.email,
  subject: "🔑 PVNBank PIN Reset Request",
  message: `You requested a PIN reset for your PVNBank account.\n\n
Click the link below (or copy and paste it into your browser):\n\n${resetUrl}\n\n
This link will expire in 15 minutes. If you did not request this, please ignore this email.`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #ddd; border-radius:8px; padding:20px;">
      <div style="text-align:center; margin-bottom:20px;">
        <img src="https://bank.pvbonline.online/image/logo.webp" alt="Pauls Valley Bank Logo" style="width:120px;" />
      </div>
      <h2 style="color:#2c3e50; text-align:center;">PIN Reset Request</h2>
      <p>Hello ${user.fullname || "Customer"},</p>
      <p>We received a request to reset your <b>transaction PIN</b>.</p>
      <p>Please click the button below to reset your PIN. This link will expire in <b>15 minutes</b>.</p>
      <div style="text-align:center; margin:30px 0;">
        <a href="${resetUrl}" style="background:#2c3e50; color:#fff; padding:12px 24px; text-decoration:none; border-radius:5px; font-weight:bold;">Reset PIN</a>
      </div>
      <p>If you did not request this, you can safely ignore this email.</p>
      <br />
      <hr />
      <p style="font-size:12px; color:#888; text-align:center;">
        © ${new Date().getFullYear()} Pauls Valley Bank • Secure Banking for You
      </p>
    </div>
  `,
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






exports.getAllTransactions = async (req, res) => {
    try {
        let transactions = [...database.transactions];
        
        // Filter by userId if provided
        if (req.query.userId) {
            transactions = transactions.filter(t => t.userId === parseInt(req.query.userId));
        }
        
        // Filter by status if provided
        if (req.query.status) {
            transactions = transactions.filter(t => t.status === req.query.status);
        }
        
        // Filter by type if provided
        if (req.query.type) {
            transactions = transactions.filter(t => t.type === req.query.type);
        }
        
        // Sort by date (newest first)
        transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// Get single transaction by ID
exports.getTransactionById = async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const transaction = database.transactions.find(t => t.id === transactionId);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        res.json(transaction);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
};

// Get user's transactions
exports.getUserTransactions = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const transactions = database.transactions
            .filter(t => t.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching user transactions:', error);
        res.status(500).json({ error: 'Failed to fetch user transactions' });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const transactionIndex = database.transactions.findIndex(t => t.id === transactionId);
        
        if (transactionIndex === -1) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const { userId, type, amount, status, description, reference } = req.body;
        const existingTransaction = database.transactions[transactionIndex];
        
        // Validation
        if (type && !['deposit', 'withdrawal', 'transfer', 'loan', 'payment'].includes(type)) {
            return res.status(400).json({ error: 'Invalid transaction type' });
        }
        
        if (status && !['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid transaction status' });
        }
        
        // Update transaction
        database.transactions[transactionIndex] = {
            ...existingTransaction,
            userId: userId ? parseInt(userId) : existingTransaction.userId,
            type: type ? type.toLowerCase() : existingTransaction.type,
            amount: amount ? parseFloat(amount) : existingTransaction.amount,
            status: status ? status.toLowerCase() : existingTransaction.status,
            description: description !== undefined ? description : existingTransaction.description,
            reference: reference !== undefined ? reference : existingTransaction.reference,
            updatedAt: new Date().toISOString()
        };
        
        saveDatabase();
        
        console.log(`✓ Updated transaction ID: ${transactionId}`);
        res.json(database.transactions[transactionIndex]);
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
};

// Update transaction status only
exports.updateTransactionStatus = async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const transactionIndex = database.transactions.findIndex(t => t.id === transactionId);
        
        if (transactionIndex === -1) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const { status } = req.body;
        
        if (!status || !['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        database.transactions[transactionIndex].status = status.toLowerCase();
        database.transactions[transactionIndex].updatedAt = new Date().toISOString();
        
        saveDatabase();
        
        console.log(`✓ Updated transaction status: ${transactionId} -> ${status}`);
        res.json(database.transactions[transactionIndex]);
        
    } catch (error) {
        console.error('Error updating transaction status:', error);
        res.status(500).json({ error: 'Failed to update transaction status' });
    }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
    try {
        const transactionId = parseInt(req.params.id);
        const transactionIndex = database.transactions.findIndex(t => t.id === transactionId);
        
        if (transactionIndex === -1) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const transaction = database.transactions[transactionIndex];
        database.transactions.splice(transactionIndex, 1);
        saveDatabase();
        
        console.log(`✓ Deleted transaction ID: ${transactionId}`);
        res.json({ 
            message: 'Transaction deleted successfully',
            deletedTransaction: transaction
        });
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
};

// Get transaction statistics
exports.getTransactionStats = async (req, res) => {
    try {
        const userId = req.query.userId ? parseInt(req.query.userId) : null;
        let transactions = userId 
            ? database.transactions.filter(t => t.userId === userId)
            : database.transactions;
        
        const stats = {
            total: transactions.length,
            byStatus: {
                pending: transactions.filter(t => t.status === 'pending').length,
                completed: transactions.filter(t => t.status === 'completed').length,
                failed: transactions.filter(t => t.status === 'failed').length,
                cancelled: transactions.filter(t => t.status === 'cancelled').length
            },
            byType: {
                deposit: transactions.filter(t => t.type === 'deposit').length,
                withdrawal: transactions.filter(t => t.type === 'withdrawal').length,
                transfer: transactions.filter(t => t.type === 'transfer').length,
                loan: transactions.filter(t => t.type === 'loan').length,
                payment: transactions.filter(t => t.type === 'payment').length
            },
            totalAmount: {
                all: transactions.reduce((sum, t) => sum + t.amount, 0),
                completed: transactions
                    .filter(t => t.status === 'completed')
                    .reduce((sum, t) => sum + t.amount, 0),
                pending: transactions
                    .filter(t => t.status === 'pending')
                    .reduce((sum, t) => sum + t.amount, 0)
            }
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching transaction stats:', error);
        res.status(500).json({ error: 'Failed to fetch transaction statistics' });
    }
};