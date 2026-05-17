jest.mock("../../src/config/db", () => ({ query: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");

describe("notifications API — ошибки", () => {
  test("GET / 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).get("/api/notifications").set(authHeader());
    expect(res.status).toBe(500);
  });

  test("unread-count 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).get("/api/notifications/unread-count").set(authHeader());
    expect(res.status).toBe(500);
  });

  test("read-all 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).patch("/api/notifications/read-all").set(authHeader());
    expect(res.status).toBe(500);
  });

  test("read one 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).patch("/api/notifications/3/read").set(authHeader());
    expect(res.status).toBe(500);
  });
});
