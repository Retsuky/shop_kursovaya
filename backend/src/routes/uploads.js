const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

function extFromMimetype(mt) {
  if (!mt || typeof mt !== "string") {
    return ".img";
  }
  if (/jpeg/i.test(mt)) {
    return ".jpg";
  }
  if (/png/i.test(mt)) {
    return ".png";
  }
  if (/gif/i.test(mt)) {
    return ".gif";
  }
  if (/webp/i.test(mt)) {
    return ".webp";
  }
  return ".img";
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const raw = path.extname(file.originalname || "").toLowerCase();
    const fromName =
      ({ ".jpg": ".jpg", ".jpeg": ".jpg", ".png": ".png", ".gif": ".gif", ".webp": ".webp" })[raw] || null;
    const ext = fromName ?? extFromMimetype(file.mimetype);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
  if (!ok) {
    return cb(new Error("INVALID_TYPE"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

function publicBase(req) {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  const host = req.get("host") || `localhost:${process.env.PORT || 3020}`;
  const proto = req.protocol === "http" || req.protocol === "https" ? req.protocol : "http";
  return `${proto}://${host}`;
}

router.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Файл слишком большой (максимум 5 МБ)." });
      }
      return res.status(400).json({ message: "Не удалось принять файл." });
    }
    if (err) {
      return res.status(400).json({ message: "Допустимы только изображения JPEG, PNG, GIF или WebP." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Выберите файл изображения." });
    }
    const url = `${publicBase(req)}/uploads/${req.file.filename}`;
    return res.status(201).json({ url });
  });
});

module.exports = router;
