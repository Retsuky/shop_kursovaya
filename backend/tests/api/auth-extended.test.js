jest.mock("../../src/config/db", () => ({ query: jest.fn() }));

const bcrypt = require("bcryptjs");
const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { userRow } = require("../helpers/mockPool");

describe("auth API — доп. ветки", () => {
  test("register 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ name: "A", email: "a@t.ru", password: "secret12" });
    expect(res.status).toBe(500);
  });

  test("login 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "a@t.ru", password: "x" });
    expect(res.status).toBe(500);
  });

  test("me 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).get("/api/auth/me").set(authHeader());
    expect(res.status).toBe(500);
  });

  test("profile — длина и протокол", async () => {
    const long = "http://localhost:3020/uploads/" + "a".repeat(2040);
    const res = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ avatar_url: long });
    expect(res.status).toBe(400);
  });

  test("password — неверный текущий", async () => {
    const hash = await bcrypt.hash("oldpass12", 10);
    pool.query.mockResolvedValueOnce({ rows: [{ password_hash: hash }] });
    const res = await request(createApp())
      .patch("/api/auth/password")
      .set(authHeader())
      .send({ currentPassword: "wrong", newPassword: "newpass12" });
    expect(res.status).toBe(401);
  });

  test("profile — только uploads и длинные реквизиты", async () => {
    const noUploads = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ avatar_url: "https://example.com/photo.jpg" });
    expect(noUploads.status).toBe(400);

    const longPay = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ payment_details: "x".repeat(4001) });
    expect(longPay.status).toBe(400);
  });

  test("password — 500", async () => {
    const hash = await bcrypt.hash("oldpass12", 10);
    pool.query.mockResolvedValueOnce({ rows: [{ password_hash: hash }] });
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp())
      .patch("/api/auth/password")
      .set(authHeader())
      .send({ currentPassword: "oldpass12", newPassword: "newpass12" });
    expect(res.status).toBe(500);
  });

  test("profile — 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ payment_details: "ok" });
    expect(res.status).toBe(500);
  });

  test("login — неверный пароль", async () => {
    const hash = await bcrypt.hash("realpass12", 10);
    pool.query.mockResolvedValueOnce({ rows: [userRow({ password_hash: hash })] });
    const res = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "admin@shop.local", password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  test("password — пустые поля", async () => {
    const res = await request(createApp())
      .patch("/api/auth/password")
      .set(authHeader())
      .send({ currentPassword: "", newPassword: "" });
    expect(res.status).toBe(400);
  });

  test("PATCH /profile — user null после update", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [] });
    const res = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ payment_details: "ok" });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  test("password — пользователь не найден", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(createApp())
      .patch("/api/auth/password")
      .set(authHeader())
      .send({ currentPassword: "a", newPassword: "newpass12" });
    expect(res.status).toBe(404);
  });
});
