const express = require("express");
const { getQuote } = require("../controllers/pricingController");

const router = express.Router();

router.post("/quote", getQuote);

module.exports = router;