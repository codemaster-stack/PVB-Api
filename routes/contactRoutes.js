// routes/contactRoutes.js
const express = require("express");
const router = express.Router();
const { submitContactMessage } = require("../controllers/contactController");
// const { protect } = require("../middleware/auth"); // future use

// Guests & logged-in users can both send messages
router.post("/", submitContactMessage);

module.exports = router;
