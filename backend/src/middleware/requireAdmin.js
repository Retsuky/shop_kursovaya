const requireAuth = require("./requireAuth");

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user?.is_admin) {
      return res.status(403).json({ message: "Доступ только для администратора." });
    }
    return next();
  });
}

module.exports = requireAdmin;
