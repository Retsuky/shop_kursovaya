const express = require("express");
const auth = require("./auth");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ message: "Backend is running." });
});

router.use("/auth", auth);

module.exports = router;
