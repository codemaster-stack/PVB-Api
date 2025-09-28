// routes/adminCardRoutes.js
const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { protectAdmin } = require('../middleware/adminMiddleware'); // Assuming you have admin auth middleware

// Admin routes
router.post('/create-card', protectAdmin, cardController.adminCreateCard);
router.get('/pending-cards', protectAdmin, cardController.getPendingCards);
router.get('/all-cards', protectAdmin, cardController.getAllCards);
router.put('/approve-card/:cardId', protectAdmin, cardController.approveCard);
router.put('/reject-card/:cardId', protectAdmin, cardController.rejectCard);
router.put('/deactivate-card/:cardId', protectAdmin, cardController.deactivateCard);
router.put('/reactivate-card/:cardId',protectAdmin, cardController.reactivateCard);

module.exports = router;