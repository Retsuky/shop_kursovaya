const requireAuth = require("./requireAuth");
const pool = require("../config/db");

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    pool
      .query("SELECT is_admin FROM users WHERE id = $1", [req.user.id])
      .then(({ rows }) => {
        if (!rows[0]?.is_admin) {
          return res.status(403).json({ message: "Доступ только для администратора." });
        }
        return next();
      })
      .catch((err) => {
        console.error("requireAdmin:", err);
        return res.status(500).json({ message: "Не удалось проверить права." });
      });
  });
}

module.exports = requireAdmin;
