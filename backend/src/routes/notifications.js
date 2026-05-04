const express = require("express");
const pool = require("../config/db");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.use(requireAuth);

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    user_id: row.user_id,
    purchase_id: row.purchase_id,
    type: row.type,
    title: row.title,
    body: row.body ?? "",
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

router.get("/", async (req, res) => {
  const userId = req.user.id;
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 50;

  try {
    const result = await pool.query(
      `
        SELECT id, user_id, purchase_id, type, title, body, read_at, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [userId, limit]
    );

    return res.status(200).json({ items: result.rows.map(mapRow) });
  } catch (error) {
    console.error("List notifications:", error);
    return res.status(500).json({ message: "Не удалось загрузить уведомления." });
  }
});

router.get("/unread-count", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );

    const count = result.rows[0]?.c ?? 0;
    return res.status(200).json({ count });
  } catch (error) {
    console.error("Unread count:", error);
    return res.status(500).json({ message: "Не удалось получить счётчик." });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const result = await pool.query(
      `
        UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND read_at IS NULL
        RETURNING id
      `,
      [req.user.id]
    );

    return res.status(200).json({ updated: result.rowCount });
  } catch (error) {
    console.error("Mark all read:", error);
    return res.status(500).json({ message: "Не удалось отметить уведомления." });
  }
});

router.patch("/:id/read", async (req, res) => {
  const nid = Number(req.params.id);

  if (!Number.isInteger(nid) || nid < 1) {
    return res.status(400).json({ message: "Некорректный идентификатор." });
  }

  try {
    const result = await pool.query(
      `
        UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 AND read_at IS NULL
        RETURNING id, user_id, purchase_id, type, title, body, read_at, created_at
      `,
      [nid, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Уведомление не найдено или уже прочитано." });
    }

    return res.status(200).json(mapRow(result.rows[0]));
  } catch (error) {
    console.error("Mark notification read:", error);
    return res.status(500).json({ message: "Не удалось отметить уведомление." });
  }
});

module.exports = router;
