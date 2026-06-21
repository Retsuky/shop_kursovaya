jest.mock("../../src/config/db", () => ({ query: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");

describe("notifications API", () => {
  beforeEach(() => jest.clearAllMocks());

  test("401 без авторизации", async () => {
    const res = await request(createApp()).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  test("GET /", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          user_id: 1,
          purchase_id: 2,
          type: "deal_update",
          title: "T",
          body: "B",
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const res = await request(createApp()).get("/api/notifications").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  test("GET /unread-count", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ c: 3 }] });
    const res = await request(createApp()).get("/api/notifications/unread-count").set(authHeader());
    expect(res.body.count).toBe(3);
  });

  test("PATCH /read-all", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 1 }, { id: 2 }] });
    const res = await request(createApp()).patch("/api/notifications/read-all").set(authHeader());
    expect(res.body.updated).toBe(2);
  });

  test("PATCH /:id/read — ошибки", async () => {
    const bad = await request(createApp()).patch("/api/notifications/0/read").set(authHeader());
    expect(bad.status).toBe(400);

    pool.query.mockResolvedValueOnce({ rows: [] });
    const missing = await request(createApp()).patch("/api/notifications/5/read").set(authHeader());
    expect(missing.status).toBe(404);
  });

  test("GET / — mapRow(null)", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [null],
    });
    const res = await request(createApp()).get("/api/notifications").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([null]);
  });

  test("PATCH /:id/read — успех", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 5,
          user_id: 1,
          purchase_id: null,
          type: "x",
          title: "T",
          body: "",
          read_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
    });
    const res = await request(createApp()).patch("/api/notifications/5/read").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(5);
  });
});
