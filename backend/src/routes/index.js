const express = require("express");
const auth = require("./auth");
const purchases = require("./purchases");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ message: "Backend is running." });
});

router.use("/auth", auth);
router.use("/purchases", purchases);

module.exports = router;
