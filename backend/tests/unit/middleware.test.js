const jwt = require("jsonwebtoken");
const requireAuth = require("../../src/middleware/requireAuth");
const optionalAuth = require("../../src/middleware/optionalAuth");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("requireAuth", () => {
  test("401 без заголовка", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("успех с валидным токеном", () => {
    const token = jwt.sign({ id: 1, email: "a@t.ru", is_admin: true }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(1);
  });

  test("401 с битым токеном", () => {
    const req = { headers: { authorization: "Bearer bad" } };
    const res = mockRes();
    requireAuth(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("optionalAuth", () => {
  test("без токена вызывает next", () => {
    const req = { headers: {} };
    const next = jest.fn();
    optionalAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  test("валидный токен устанавливает user", () => {
    const token = jwt.sign({ id: 2, email: "b@t.ru" }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    optionalAuth(req, mockRes(), next);
    expect(req.user.id).toBe(2);
  });
});
