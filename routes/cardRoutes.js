// routes/cardRoutes.js
const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { protect } = require('../middleware/auth');

// User routes
router.post('/create-card', protect, cardController.createCardApplication);
router.get('/view-card', protect, cardController.getUserCard);
router.post('/card-purchase', protect, cardController.cardPurchase);
module.exports = router;


