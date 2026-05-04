const express = require("express");
const auth = require("./auth");
const admin = require("./admin");
const purchases = require("./purchases");
const uploads = require("./uploads");
const notifications = require("./notifications");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ message: "Backend is running." });
});

router.use("/auth", auth);
router.use("/admin", admin);
router.use("/uploads", uploads);
router.use("/purchases", purchases);
router.use("/notifications", notifications);

module.exports = router;
