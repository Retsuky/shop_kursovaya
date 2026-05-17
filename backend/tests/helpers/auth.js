const jwt = require("jsonwebtoken");

function signToken(overrides = {}) {
  return jwt.sign(
    {
      id: 1,
      email: "admin@shop.local",
      is_admin: true,
      ...overrides,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function authHeader(overrides) {
  return { Authorization: `Bearer ${signToken(overrides)}` };
}

module.exports = { signToken, authHeader };
