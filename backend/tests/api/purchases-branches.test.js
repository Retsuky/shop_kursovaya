jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { purchaseRow, futureDeadline } = require("../helpers/mockPool");

const validBody = {
  title: "Z",
  product_name: "P",
  unit_price: 50,
  min_participants: 1,
  deadline: futureDeadline(),
};

describe("purchases — дополнительные ветки", () => {
  test("каталог: deal=closed_group, sort=closing", async () => {
    pool.query.mockResolvedValue({ rows: [{ c: 0 }] });
    const res = await request(createApp())
      .get("/api/purchases/catalog")
      .query({ deal: "closed_group", sort: "closing", deal2: "all" })
      .query({ deal: "all" });
    expect(res.status).toBe(200);
  });

  test("join: валидация", async () => {
    const bad = await request(createApp())
      .post("/api/purchases/1/join")
      .set(authHeader())
      .send({ delivery_method: "courier" });
    expect(bad.status).toBe(400);
  });

  test("status: cancel и запреты", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s === "SELECT * FROM purchases WHERE id = $1") {
        return { rows: [purchaseRow({ organizer_id: 10, status: "completed" })] };
      }
      if (s.includes("UPDATE purchases SET status = 'cancelled'")) {
        return { rowCount: 1 };
      }
      if (s.includes("FROM purchases p INNER JOIN users")) {
        return { rows: [purchaseRow({ status: "cancelled" })] };
      }
      if (s.includes("SELECT title FROM purchases")) {
        return { rows: [{ title: "T" }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const cancel = await request(createApp())
      .patch("/api/purchases/1/status")
      .set(authHeader({ id: 10 }))
      .send({ status: "cancelled" });
    expect(cancel.status).toBe(200);

    pool.query.mockImplementationOnce(async () => ({
      rows: [purchaseRow({ organizer_id: 10, status: "completed" })],
    }));
    const same = await request(createApp())
      .patch("/api/purchases/1/status")
      .set(authHeader({ id: 10 }))
      .send({ status: "completed" });
    expect(same.status).toBe(200);
  });

  test("submit/parse ошибки", async () => {
    const bad = await request(createApp())
      .post("/api/purchases")
      .set(authHeader())
      .send({ ...validBody, unit_price: -1 });
    expect(bad.status).toBe(400);
  });

  test("discussion: пустое тело", async () => {
    const res = await request(createApp())
      .post("/api/purchases/1/discussion")
      .set(authHeader())
      .send({ body: "   " });
    expect(res.status).toBe(400);
  });

  test("review: неверный рейтинг", async () => {
    const res = await request(createApp())
      .post("/api/purchases/1/reviews")
      .set(authHeader())
      .send({ rating: 9 });
    expect(res.status).toBe(400);
  });

  test("GET /:id pending_review скрыт", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("WHERE p.id = $1") && s.includes("organizer_name")) {
        return { rows: [purchaseRow({ status: "pending_review", organizer_id: 99 })] };
      }
      if (s.includes("SELECT is_admin FROM users")) {
        return { rows: [{ is_admin: false }] };
      }
      return { rows: [], rowCount: 0 };
    });
    const res = await request(createApp()).get("/api/purchases/1");
    expect(res.status).toBe(404);
  });
});
