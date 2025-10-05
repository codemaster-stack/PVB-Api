// routes/adminCardRoutes.js
const express = require('express');
const router = express.Router();
const {adminCreateCard, getPendingCards, getAllCards, approveCard, rejectCard, deactivateCard, reactivateCard, adminFundCard} = require('../controllers/cardController');
const { protectAdmin } = require('../middleware/adminMiddleware'); // Assuming you have admin auth middleware

// Admin routes
router.post('/create-card', protectAdmin, adminCreateCard);
router.get('/pending-cards', protectAdmin, getPendingCards);
router.get('/all-cards', protectAdmin, getAllCards);
router.put('/approve-card/:cardId', protectAdmin, approveCard);
router.put('/reject-card/:cardId', protectAdmin, rejectCard);
router.put('/deactivate-card/:cardId', protectAdmin, deactivateCard);
router.put('/reactivate-card/:cardId',protectAdmin, reactivateCard);
router.post('/fund-card', protectAdmin, adminFundCard);

module.exports = router;