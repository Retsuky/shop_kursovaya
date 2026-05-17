const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const routes = require("../../src/routes");

/** Express-приложение для supertest (без listen и initDb). */
function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  const uploadsDir = path.join(__dirname, "..", "..", "uploads-test");
  fs.mkdirSync(uploadsDir, { recursive: true });

  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));
  app.use("/api", routes);

  return app;
}

module.exports = { createApp };
