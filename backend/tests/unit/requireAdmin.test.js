jest.mock("../../src/config/db", () => ({ query: jest.fn() }));

const jwt = require("jsonwebtoken");
const pool = require("../../src/config/db");
const requireAdmin = require("../../src/middleware/requireAdmin");

function run(req) {
  return new Promise((resolve) => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((body) => resolve({ status: res.status.mock.calls[0]?.[0], body })),
    };
    const next = jest.fn(() => resolve({ status: 200, next: true }));
    requireAdmin(req, res, next);
  });
}

describe("requireAdmin", () => {
  test("403 не админ", async () => {
    const token = jwt.sign({ id: 1, email: "a@t.ru", is_admin: false }, process.env.JWT_SECRET);
    pool.query.mockResolvedValueOnce({ rows: [{ is_admin: false }] });
    const out = await run({ headers: { authorization: `Bearer ${token}` } });
    expect(out.status).toBe(403);
  });

  test("500 при ошибке БД", async () => {
    const token = jwt.sign({ id: 1, email: "a@t.ru", is_admin: true }, process.env.JWT_SECRET);
    pool.query.mockRejectedValueOnce(new Error("db"));
    const out = await run({ headers: { authorization: `Bearer ${token}` } });
    expect(out.status).toBe(500);
  });
});
