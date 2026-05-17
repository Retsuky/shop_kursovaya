jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { purchaseRow, userRow, futureDeadline } = require("../helpers/mockPool");

describe("admin API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT is_admin FROM users WHERE id")) {
        return { rows: [{ is_admin: true }] };
      }
      if (s.includes("FROM users ORDER BY")) {
        return { rows: [userRow()] };
      }
      if (s.includes("FROM purchases p") && s.includes("pending_review")) {
        return { rows: [purchaseRow({ status: "pending_review" })] };
      }
      if (s.includes("FROM purchases p")) {
        return { rows: [purchaseRow()] };
      }
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [purchaseRow()] };
      }
      if (s.includes("FROM purchase_participants pp")) {
        return {
          rows: [
            {
              user_id: 2,
              quantity: 1,
              participant_status: "assembly",
              delivery_method: "pickup",
              payment_method: "card",
              delivery_address: "",
              delivery_comment: "",
              user_name: "U",
              user_email: "u@t.ru",
              avatar_url: "",
              paid_at: new Date(),
            },
          ],
        };
      }
      if (s.includes("INSERT INTO purchases")) {
        return { rows: [{ id: 9 }] };
      }
      if (s.includes("SELECT id FROM users WHERE id = $1")) {
        return { rows: [{ id: 1 }] };
      }
      if (s.includes("SELECT id, organizer_id, title, status FROM purchases")) {
        return { rows: [purchaseRow({ status: "pending_review" })] };
      }
      if (s.includes("UPDATE purchases SET status = 'collecting'")) {
        return { rowCount: 1 };
      }
      if (s.includes("UPDATE purchases SET status = 'rejected'")) {
        return { rowCount: 1 };
      }
      if (s.includes("DELETE FROM purchases")) {
        return { rows: [{ id: 1 }] };
      }
      if (s.includes("COUNT(*)::int AS c FROM users WHERE is_admin")) {
        return { rows: [{ c: 2 }] };
      }
      if (s.includes("SELECT is_admin FROM users WHERE id = $1") && s.includes("DELETE")) {
        return { rows: [{ is_admin: false }] };
      }
      if (s.includes("participant_status") && s.includes("FROM purchase_participants")) {
        return {
          rows: [{ participant_status: "assembly", delivery_method: "pickup", delivery_address: "" }],
        };
      }
      if (s.includes("COUNT(*)::int AS total")) {
        return { rows: [{ total: 1, handed: 1 }] };
      }
      if (s.includes("SELECT status FROM purchases WHERE id = $1")) {
        return { rows: [{ status: "closed" }] };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  test("403 для не-админа", async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: false }] }));
    const res = await request(createApp()).get("/api/admin/users").set(authHeader({ is_admin: true }));
    expect(res.status).toBe(403);
  });

  test("GET /users", async () => {
    const res = await request(createApp()).get("/api/admin/users").set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("CRUD purchases и submissions", async () => {
    const list = await request(createApp()).get("/api/admin/purchases").set(authHeader());
    expect(list.status).toBe(200);

    const detail = await request(createApp()).get("/api/admin/purchases/1").set(authHeader());
    expect(detail.status).toBe(200);

    const subs = await request(createApp()).get("/api/admin/submissions").set(authHeader());
    expect(subs.status).toBe(200);

    const create = await request(createApp())
      .post("/api/admin/purchases")
      .set(authHeader())
      .send({
        organizer_id: 1,
        title: "A",
        product_name: "P",
        unit_price: 10,
        min_participants: 1,
        deadline: futureDeadline(),
      });
    expect(create.status).toBe(201);

    const approve = await request(createApp()).post("/api/admin/purchases/1/approve").set(authHeader());
    expect(approve.status).toBe(200);

    const reject = await request(createApp()).post("/api/admin/purchases/1/reject").set(authHeader());
    expect(reject.status).toBe(200);

    const del = await request(createApp()).delete("/api/admin/purchases/1").set(authHeader());
    expect(del.status).toBe(200);
  });

  test("PATCH participant", async () => {
    const res = await request(createApp())
      .patch("/api/admin/purchases/1/participants/2")
      .set(authHeader())
      .send({ participant_status: "handed" });
    expect(res.status).toBe(200);
  });
});
