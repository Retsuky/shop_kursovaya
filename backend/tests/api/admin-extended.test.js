jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { purchaseRow, userRow, futureDeadline } = require("../helpers/mockPool");

function adminPool() {
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql);
    if (s.includes("SELECT is_admin FROM users WHERE id = $1") && !s.includes("DELETE")) {
      return { rows: [{ is_admin: true }] };
    }
    if (s.includes("FROM users ORDER BY")) {
      return { rows: [userRow()] };
    }
    if (s.includes("SELECT id, is_admin FROM users WHERE id = $1")) {
      return { rows: [{ id: params[0], is_admin: false }] };
    }
    if (s.includes("COUNT(*)::int AS c FROM users WHERE is_admin = TRUE")) {
      return { rows: [{ c: 2 }] };
    }
    if (s.includes("UPDATE users SET is_admin")) {
      return { rowCount: 1 };
    }
    if (s.includes("FROM users WHERE id = $1") && s.includes("avatar_url")) {
      return { rows: [userRow({ id: params[0] })] };
    }
    if (s.includes("SELECT is_admin FROM users WHERE id = $1") && s.includes("DELETE")) {
      return { rows: [{ is_admin: false }] };
    }
    if (s.includes("DELETE FROM users WHERE id = $1")) {
      return { rowCount: 1 };
    }
    if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
      return { rows: [purchaseRow({ status: "collecting" })] };
    }
    if (s.includes("FROM purchases p") && s.includes("pending_review")) {
      return { rows: [purchaseRow({ status: "pending_review" })] };
    }
    if (s.includes("FROM purchases p") && s.includes("NOT IN")) {
      return { rows: [purchaseRow()] };
    }
    if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
      return { rows: [{ id: params[0], status: "collecting" }] };
    }
    if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) {
      return { rowCount: 1 };
    }
    if (s.includes("SELECT id FROM users WHERE id = $1")) {
      return { rows: [{ id: params[0] }] };
    }
    if (s.includes("INSERT INTO purchases")) {
      return { rows: [{ id: 99 }] };
    }
    if (s.includes("DELETE FROM purchases WHERE id = $1")) {
      return { rows: [{ id: params[0] }] };
    }
    if (s.includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
      return { rows: [purchaseRow({ status: "pending_review" })] };
    }
    if (s.includes("UPDATE purchases SET status = 'collecting'")) {
      return { rowCount: 1 };
    }
    if (s.includes("UPDATE purchases SET status = 'rejected'")) {
      return { rowCount: 1 };
    }
    if (s.includes("FROM purchase_participants pp") && s.includes("user_email")) {
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
    if (s.includes("UPDATE purchase_participants")) {
      return { rowCount: 1 };
    }
    if (s.includes("INSERT INTO notifications")) {
      return { rowCount: 1 };
    }
    if (s.includes("participant_status = 'processing'")) {
      return { rowCount: 1 };
    }
    if (s.includes("SELECT title FROM purchases")) {
      return { rows: [{ title: "T" }] };
    }
    return { rows: [], rowCount: 0 };
  });
}

describe("admin API — расширенное покрытие", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminPool();
  });

  test("GET /users — 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).get("/api/admin/users").set(authHeader());
    expect(res.status).toBe(500);
  });

  test("PATCH /users/:id — валидация", async () => {
    const badId = await request(createApp()).patch("/api/admin/users/x").set(authHeader()).send({ is_admin: true });
    expect(badId.status).toBe(400);
    const badField = await request(createApp()).patch("/api/admin/users/2").set(authHeader()).send({ is_admin: "yes" });
    expect(badField.status).toBe(400);
  });

  test("PATCH /users/:id — 404 и последний админ", async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    const missing = await request(createApp()).patch("/api/admin/users/9").set(authHeader()).send({ is_admin: false });
    expect(missing.status).toBe(404);

    adminPool();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ id: 2, is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ c: 1 }] }));
    const lastAdmin = await request(createApp()).patch("/api/admin/users/2").set(authHeader()).send({ is_admin: false });
    expect(lastAdmin.status).toBe(400);
  });

  test("PATCH /users/:id — успех", async () => {
    const res = await request(createApp()).patch("/api/admin/users/3").set(authHeader()).send({ is_admin: true });
    expect(res.status).toBe(200);
  });

  test("DELETE /users/:id — валидация и ограничения", async () => {
    const self = await request(createApp()).delete("/api/admin/users/1").set(authHeader({ id: 1 }));
    expect(self.status).toBe(400);

    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ c: 1 }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    const last = await request(createApp()).delete("/api/admin/users/2").set(authHeader());
    expect(last.status).toBe(400);

    adminPool();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ c: 2 }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    const missing = await request(createApp()).delete("/api/admin/users/9").set(authHeader());
    expect(missing.status).toBe(404);
  });

  test("DELETE /users/:id — успех", async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ c: 2 }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: false }] }));
    pool.query.mockImplementationOnce(async () => ({ rowCount: 1 }));
    const res = await request(createApp()).delete("/api/admin/users/5").set(authHeader());
    expect(res.status).toBe(200);
  });

  test("GET /purchases/:id — 404", async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    const res = await request(createApp()).get("/api/admin/purchases/999").set(authHeader());
    expect(res.status).toBe(404);
  });

  test("POST /purchases — валидация", async () => {
    const empty = await request(createApp()).post("/api/admin/purchases").set(authHeader()).send({});
    expect(empty.status).toBe(400);

    const badOrg = await request(createApp())
      .post("/api/admin/purchases")
      .set(authHeader())
      .send({
        organizer_id: 0,
        title: "T",
        product_name: "P",
        unit_price: 1,
        min_participants: 1,
        deadline: futureDeadline(),
      });
    expect(badOrg.status).toBe(400);
  });

  test("POST /purchases — организатор не найден", async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    const res = await request(createApp())
      .post("/api/admin/purchases")
      .set(authHeader())
      .send({
        organizer_id: 99,
        title: "T",
        product_name: "P",
        unit_price: 1,
        min_participants: 1,
        deadline: futureDeadline(),
      });
    expect(res.status).toBe(400);
  });

  test("PATCH /purchases/:id — валидация полей", async () => {
    const noFields = await request(createApp()).patch("/api/admin/purchases/1").set(authHeader()).send({});
    expect(noFields.status).toBe(400);

    const badPrice = await request(createApp())
      .patch("/api/admin/purchases/1")
      .set(authHeader())
      .send({ unit_price: -1 });
    expect(badPrice.status).toBe(400);

    const badStatus = await request(createApp())
      .patch("/api/admin/purchases/1")
      .set(authHeader())
      .send({ status: "invalid" });
    expect(badStatus.status).toBe(400);
  });

  test("PATCH /purchases/:id — смена статуса collecting→closed", async () => {
    const res = await request(createApp())
      .patch("/api/admin/purchases/1")
      .set(authHeader())
      .send({ status: "closed" });
    expect(res.status).toBe(200);
  });

  test("PATCH /purchases/:id — pending_review нельзя в collecting", async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ id: 1, status: "pending_review" }] }));
    const res = await request(createApp())
      .patch("/api/admin/purchases/1")
      .set(authHeader())
      .send({ status: "collecting" });
    expect(res.status).toBe(400);
  });

  test("DELETE /purchases/:id — 404", async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    const res = await request(createApp()).delete("/api/admin/purchases/999").set(authHeader());
    expect(res.status).toBe(404);
  });

  test("PATCH participant — валидация", async () => {
    const noFields = await request(createApp())
      .patch("/api/admin/purchases/1/participants/2")
      .set(authHeader())
      .send({});
    expect(noFields.status).toBe(400);

    const badStatus = await request(createApp())
      .patch("/api/admin/purchases/1/participants/2")
      .set(authHeader())
      .send({ participant_status: "bad" });
    expect(badStatus.status).toBe(400);

    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    const missing = await request(createApp())
      .patch("/api/admin/purchases/1/participants/9")
      .set(authHeader())
      .send({ participant_status: "handed" });
    expect(missing.status).toBe(404);
  });

  test("approve/reject — не pending", async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [purchaseRow({ status: "collecting" })] }));
    const approve = await request(createApp()).post("/api/admin/purchases/1/approve").set(authHeader());
    expect(approve.status).toBe(400);

    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [purchaseRow({ status: "collecting" })] }));
    const reject = await request(createApp()).post("/api/admin/purchases/1/reject").set(authHeader());
    expect(reject.status).toBe(400);
  });
});
