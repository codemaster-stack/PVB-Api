const express = require("express");
const { applyForLoan } = require("../controllers/loanController");
const { protect } = require("../middleware/auth"); // JWT middleware

const router = express.Router();

router.post("/apply", protect, applyForLoan);

module.exports = router;
