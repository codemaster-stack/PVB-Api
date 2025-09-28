const express = require("express");
const { publicLoanApply } = require("../controllers/publicLoanController");

const router = express.Router();

router.post("/apply", publicLoanApply);

module.exports = router;
