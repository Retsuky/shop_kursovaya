const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require("./routes");
const initDb = require("./services/initDb");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3020;

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
