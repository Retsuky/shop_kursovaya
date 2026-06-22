function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const issues = [];

  const jwtSecret = process.env.JWT_SECRET?.trim();
  const weakJwtSecrets = ["secret", "changeme", "docker-devchange-me", "docker-dev-change-me", "your-jwt-secret"];
  if (!jwtSecret || weakJwtSecrets.includes(jwtSecret)) {
    issues.push(
      "JWT_SECRET должен быть задан и не совпадать с дефолтными значениями (secret, changeme, docker-devchange-me, your-jwt-secret)."
    );
  }

  const dbPassword = process.env.DB_PASSWORD?.trim();
  if (!dbPassword) {
    issues.push("DB_PASSWORD должен быть задан и не пустой.");
  }

  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const weakAdminPasswords = ["admin123", "password"];
  if (!adminPassword || weakAdminPasswords.includes(adminPassword)) {
    issues.push("ADMIN_PASSWORD должен быть задан и не совпадать с дефолтными значениями (admin123, password).");
  }

  if (issues.length === 0) {
    return;
  }

  if (isProduction) {
    const message = `Проверка переменных окружения не пройдена:\n${issues.map((item) => `- ${item}`).join("\n")}`;
    console.error(message);
    throw new Error(message);
  }

  for (const issue of issues) {
    console.warn(`[env] ${issue}`);
  }
}

require("dotenv").config();
try {
  validateEnv();
} catch {
  process.exit(1);
}

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const initDb = require("./services/initDb");

const app = express();
const PORT = Number(process.env.PORT) || 3020;

app.set("trust proxy", 1);

const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.use("/api", routes);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database init error:", error);
    process.exit(1);
  });
