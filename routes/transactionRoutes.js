
// routes/transactionRoutes.js
const express = require("express");
const router = express.Router();
const { transfer } = require("../controllers/transferController");
const { getTransactionHistory, downloadStatement, createPin, forgotPin, resetPin } = require("../controllers/transferController")
const { protect } = require("../middleware/auth"); // JWT auth middleware

// Transfer money
router.post("/transfer", protect, transfer);
router.get("/history", protect, getTransactionHistory);
router.get("/statement", protect, downloadStatement);
router.post('/create-pin', protect, createPin);
router.post('/forgot-pin', protect, forgotPin);
router.post('/reset-pin', resetPin);

module.exports = router;
