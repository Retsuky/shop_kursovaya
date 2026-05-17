jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const bcrypt = require("bcryptjs");
const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { userRow } = require("../helpers/mockPool");

describe("auth API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /register — валидация", async () => {
    const res = await request(createApp()).post("/api/auth/register").send({});
    expect(res.status).toBe(400);
  });

  test("POST /register — конфликт email", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ name: "A", email: "a@t.ru", password: "secret12" });
    expect(res.status).toBe(409);
  });

  test("POST /register — успех", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [userRow({ id: 5, is_admin: false, password_hash: undefined })],
      });
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ name: "User", email: "new@t.ru", password: "secret12" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  test("POST /login — валидация", async () => {
    const res = await request(createApp()).post("/api/auth/login").send({ email: "" });
    expect(res.status).toBe(400);
  });

  test("POST /login — неверные данные", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "x@t.ru", password: "wrong" });
    expect(res.status).toBe(401);
  });

  test("POST /login — успех", async () => {
    const hash = await bcrypt.hash("secret12", 10);
    pool.query.mockResolvedValueOnce({ rows: [userRow({ password_hash: hash })] });
    const res = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "admin@shop.local", password: "secret12" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("admin@shop.local");
  });

  test("GET /me — 401 без токена", async () => {
    const res = await request(createApp()).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /me — 404", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(createApp()).get("/api/auth/me").set(authHeader());
    expect(res.status).toBe(404);
  });

  test("GET /me — успех", async () => {
    pool.query.mockResolvedValueOnce({ rows: [userRow()] });
    const res = await request(createApp()).get("/api/auth/me").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(1);
  });

  test("PATCH /profile — валидация", async () => {
    const res = await request(createApp()).patch("/api/auth/profile").set(authHeader()).send({});
    expect(res.status).toBe(400);
  });

  test("PATCH /profile — неверный avatar", async () => {
    const res = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ avatar_url: "ftp://bad" });
    expect(res.status).toBe(400);
  });

  test("PATCH /profile — успех", async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [userRow({ avatar_url: "http://localhost:3020/uploads/a.jpg" })] });
    const res = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ avatar_url: "http://localhost:3020/uploads/a.jpg", payment_details: "123" });
    expect(res.status).toBe(200);
  });

  test("PATCH /password — валидация и смена", async () => {
    const hash = await bcrypt.hash("oldpass12", 10);
    pool.query
      .mockResolvedValueOnce({ rows: [{ password_hash: hash }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const bad = await request(createApp())
      .patch("/api/auth/password")
      .set(authHeader())
      .send({ currentPassword: "oldpass12", newPassword: "short" });
    expect(bad.status).toBe(400);

    const ok = await request(createApp())
      .patch("/api/auth/password")
      .set(authHeader())
      .send({ currentPassword: "oldpass12", newPassword: "newpass12" });
    expect(ok.status).toBe(200);
  });
});
