const jwt = require("jsonwebtoken");

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      email: payload.email,
      is_admin: Boolean(payload.is_admin),
    };
  } catch {
    // Токен невалиден/просрочен — просто продолжаем как неавторизованный.
  }

  return next();
}

module.exports = optionalAuth;
