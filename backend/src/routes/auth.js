const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

function mapPublicUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at,
    is_admin: Boolean(row.is_admin),
    avatar_url: row.avatar_url != null ? String(row.avatar_url).trim() : "",
  };
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: Boolean(user.is_admin),
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Поля name, email и password обязательны.",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [
      normalizedEmail,
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Пользователь с таким email уже существует.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at, is_admin, avatar_url
      `,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = mapPublicUser(result.rows[0]);
    const token = createToken(result.rows[0]);

    return res.status(201).json({
      message: "Пользователь успешно зарегистрирован.",
      token,
      user,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      message: "Ошибка при регистрации пользователя.",
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Поля email и password обязательны.",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
        SELECT id, name, email, password_hash, created_at, is_admin, avatar_url
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Неверный email или пароль.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Неверный email или пароль.",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Авторизация успешна.",
      token,
      user: mapPublicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Ошибка при авторизации пользователя.",
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, email, created_at, is_admin, avatar_url
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }
    return res.status(200).json({ user: mapPublicUser(row) });
  } catch (error) {
    console.error("Auth me:", error);
    return res.status(500).json({ message: "Не удалось загрузить профиль." });
  }
});

router.patch("/profile", requireAuth, async (req, res) => {
  const rawIn = req.body?.avatar_url;
  if (rawIn === undefined) {
    return res.status(400).json({ message: "Укажите avatar_url (пустую строку, чтобы убрать фото)." });
  }

  const raw = rawIn === null || String(rawIn).trim() === "" ? "" : String(rawIn).trim();

  if (raw.length > 2048) {
    return res.status(400).json({ message: "Слишком длинная ссылка на изображение." });
  }

  if (raw !== "" && !/^https?:\/\//i.test(raw)) {
    return res.status(400).json({ message: "Разрешены только адреса с http или https." });
  }

  if (raw !== "" && !/\/uploads\//i.test(raw)) {
    return res.status(400).json({ message: "Аватаром может быть только загруженное на сервер изображение." });
  }

  try {
    await pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [raw, req.user.id]);
    const result = await pool.query(
      `
        SELECT id, name, email, created_at, is_admin, avatar_url
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );
    return res.status(200).json({ user: mapPublicUser(result.rows[0]) });
  } catch (error) {
    console.error("Patch profile:", error);
    return res.status(500).json({ message: "Не удалось сохранить аватар." });
  }
});

router.patch("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (
    currentPassword == null ||
    newPassword == null ||
    String(currentPassword).length === 0 ||
    String(newPassword).length === 0
  ) {
    return res.status(400).json({ message: "Укажите текущий пароль и новый пароль." });
  }

  const np = String(newPassword).trim();
  if (np.length < 8) {
    return res.status(400).json({ message: "Новый пароль — не меньше 8 символов." });
  }

  try {
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    const hash = result.rows[0]?.password_hash;
    if (!hash) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    const matches = await bcrypt.compare(String(currentPassword), hash);
    if (!matches) {
      return res.status(401).json({ message: "Текущий пароль указан неверно." });
    }

    const newHash = await bcrypt.hash(np, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.user.id]);

    return res.status(200).json({ message: "Пароль успешно изменён." });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Не удалось сменить пароль." });
  }
});

module.exports = router;
