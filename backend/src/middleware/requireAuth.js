const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Требуется авторизация." });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      email: payload.email,
      is_admin: Boolean(payload.is_admin),
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Недействительный или просроченный токен." });
  }
}

module.exports = requireAuth;
