jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const notifications = require("../../src/services/notifications");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { adminPurchaseRow, futureDeadline, purchaseRow, userRow } = require("../helpers/routePool");

function asAdmin() {
  return authHeader({ id: 1, is_admin: true });
}

describe("admin routes — 100% coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  function poolDefault() {
    pool.query.mockImplementation(async (sql, params) => {
      const s = String(sql);
      if (s.includes("SELECT is_admin FROM users WHERE id = $1") && !s.includes("DELETE")) {
        return { rows: [{ is_admin: true }] };
      }
      if (s.includes("FROM users ORDER BY")) return { rows: [userRow()] };
      if (s.includes("SELECT id, is_admin FROM users WHERE id = $1")) {
        return { rows: [{ id: params[0], is_admin: params[0] === 2 }] };
      }
      if (s.includes("COUNT(*)::int AS c FROM users WHERE is_admin = TRUE")) {
        return { rows: [{ c: 2 }] };
      }
      if (s.includes("UPDATE users SET is_admin")) return { rowCount: 1 };
      if (s.includes("FROM users WHERE id = $1") && s.includes("avatar_url")) {
        return { rows: [userRow({ id: params[0] })] };
      }
      if (s.includes("SELECT is_admin FROM users WHERE id = $1") && s.includes("DELETE")) {
        return { rows: [{ is_admin: false }] };
      }
      if (s.includes("DELETE FROM users WHERE id = $1")) return { rowCount: 1 };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow()] };
      }
      if (s.includes("FROM purchases p") && s.includes("NOT IN")) return { rows: [adminPurchaseRow()] };
      if (s.includes("FROM purchases p") && s.includes("pending_review")) {
        return { rows: [adminPurchaseRow({ status: "pending_review" })] };
      }
      if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
        return { rows: [{ id: params[0], status: "collecting" }] };
      }
      if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
      if (s.includes("SELECT id FROM users WHERE id = $1")) return { rows: [{ id: params[0] }] };
      if (s.includes("INSERT INTO purchases")) return { rows: [{ id: 42 }] };
      if (s.includes("DELETE FROM purchases WHERE id = $1")) return { rows: [{ id: params[0] }] };
      if (s.includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ status: "pending_review" })] };
      }
      if (s.includes("UPDATE purchases SET status = 'collecting'")) return { rowCount: 1 };
      if (s.includes("UPDATE purchases SET status = 'rejected'")) return { rowCount: 1 };
      if (s.includes("UPDATE purchases SET status = 'completed'")) return { rowCount: 1 };
      if (s.includes("FROM purchase_participants pp") && s.includes("user_email")) {
        return {
          rows: [
            {
              user_id: 2,
              quantity: 1,
              participant_status: "collecting",
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
      if (s.includes("COUNT(*)::int AS total")) return { rows: [{ total: 1, handed: 1 }] };
      if (
        s.includes("participant_status") &&
        s.includes("FROM purchase_participants") &&
        s.includes("AND user_id = $2")
      ) {
        return {
          rows: [{ participant_status: "assembly", delivery_method: "pickup", delivery_address: "Addr" }],
        };
      }
      if (s.includes("SELECT status FROM purchases WHERE id = $1")) {
        return { rows: [{ status: "closed" }] };
      }
      if (s.includes("UPDATE purchase_participants")) return { rowCount: 1 };
      if (s.includes("INSERT INTO notifications")) return { rowCount: 1 };
      if (s.includes("participant_status = 'processing'")) return { rowCount: 1 };
      if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
      return { rows: [], rowCount: 0 };
    });
    pool.connect.mockResolvedValue({
      query: jest.fn(async (sql, params) => {
        if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(sql))) return { rows: [] };
        return pool.query(sql, params);
      }),
      release: jest.fn(),
    });
  }

  test("users — ошибки и 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).get("/api/admin/users").set(asAdmin())).status).toBe(500);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect(
      (await request(createApp()).patch("/api/admin/users/2").set(asAdmin()).send({ is_admin: false })).status
    ).toBe(500);

    poolDefault();
    expect((await request(createApp()).patch("/api/admin/users/x").set(asAdmin()).send({ is_admin: true })).status).toBe(
      400
    );
    expect(
      (await request(createApp()).delete("/api/admin/users/x").set(asAdmin())).status
    ).toBe(400);
    expect(
      (await request(createApp()).delete("/api/admin/users/1").set(asAdmin({ id: 1 }))).status
    ).toBe(400);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ c: 1 }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    expect((await request(createApp()).delete("/api/admin/users/2").set(asAdmin())).status).toBe(400);

    poolDefault();
    pool.query.mockRejectedValueOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT is_admin FROM users")) return { rows: [{ is_admin: true }] };
      throw new Error("db");
    });
    expect((await request(createApp()).delete("/api/admin/users/5").set(asAdmin())).status).toBe(500);
  });

  test("purchases list/detail — ошибки", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT is_admin FROM users")) return { rows: [{ is_admin: true }] };
      if (s.includes("FROM purchases p") && s.includes("NOT IN")) throw new Error("db");
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).get("/api/admin/purchases").set(asAdmin())).status).toBe(500);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT is_admin FROM users")) return { rows: [{ is_admin: true }] };
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).get("/api/admin/purchases/x").set(asAdmin())).status).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT is_admin FROM users")) return { rows: [{ is_admin: true }] };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).get("/api/admin/purchases/9").set(asAdmin())).status).toBe(404);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT is_admin FROM users")) return { rows: [{ is_admin: true }] };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) throw new Error("db");
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).get("/api/admin/purchases/1").set(asAdmin())).status).toBe(500);
  });

  test("POST /purchases — все валидации и 500", async () => {
    poolDefault();
    const base = {
      organizer_id: 1,
      title: "T",
      product_name: "P",
      unit_price: 10,
      min_participants: 2,
      deadline: futureDeadline(),
    };
    expect((await request(createApp()).post("/api/admin/purchases").set(asAdmin()).send({})).status).toBe(400);
    expect(
      (await request(createApp()).post("/api/admin/purchases").set(asAdmin()).send({ ...base, unit_price: -1 })).status
    ).toBe(400);
    expect(
      (await request(createApp())
        .post("/api/admin/purchases")
        .set(asAdmin())
        .send({ ...base, min_participants: 0 })).status
    ).toBe(400);
    expect(
      (await request(createApp())
        .post("/api/admin/purchases")
        .set(asAdmin())
        .send({ ...base, deadline: "bad" })).status
    ).toBe(400);
    expect(
      (await request(createApp())
        .post("/api/admin/purchases")
        .set(asAdmin())
        .send({ ...base, retail_price: -5 })).status
    ).toBe(400);
    expect(
      (await request(createApp())
        .post("/api/admin/purchases")
        .set(asAdmin())
        .send({ ...base, status: "nope" })).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT is_admin FROM users")) return { rows: [{ is_admin: true }] };
      if (s.includes("SELECT id FROM users WHERE id = $1")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).post("/api/admin/purchases").set(asAdmin()).send(base)).status
    ).toBe(400);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect(
      (await request(createApp()).post("/api/admin/purchases").set(asAdmin()).send(base)).status
    ).toBe(500);

    poolDefault();
    const full = await request(createApp())
      .post("/api/admin/purchases")
      .set(asAdmin())
      .send({
        ...base,
        description: "d",
        city: "c",
        pickup_address: "a",
        category: "cat",
        image_url: "http://localhost:3020/uploads/x.jpg",
        retail_price: 100,
        status: "closed",
      });
    expect(full.status).toBe(201);
  });

  test("PATCH /purchases/:id — все поля и ветки", async () => {
    poolDefault();
    expect((await request(createApp()).patch("/api/admin/purchases/x").set(asAdmin()).send({ title: "x" })).status).toBe(
      400
    );

    const body = {
      title: "N",
      description: "d",
      product_name: "p",
      unit_price: 20,
      min_participants: 3,
      deadline: futureDeadline(),
      city: "c",
      pickup_address: "a",
      category: "cat",
      image_url: "/uploads/i.jpg",
      retail_price: null,
      organizer_id: 1,
      status: "closed",
    };
    expect((await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send(body)).status).toBe(200);

    poolDefault();
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send({ unit_price: -1 })).status
    ).toBe(400);
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send({ min_participants: 0 })).status
    ).toBe(400);
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send({ deadline: "x" })).status
    ).toBe(400);
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send({ retail_price: -1 })).status
    ).toBe(400);
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send({ organizer_id: 0 })).status
    ).toBe(400);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send({ organizer_id: 99 })).status
    ).toBe(400);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    expect(
      (await request(createApp()).patch("/api/admin/purchases/9").set(asAdmin()).send({ title: "x" })).status
    ).toBe(404);

    poolDefault();
    jest.spyOn(notifications, "notifyStatusChange").mockRejectedValueOnce(new Error("notify"));
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send({ status: "closed" })).status
    ).toBe(200);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(asAdmin()).send({ title: "fail" })).status
    ).toBe(500);
  });

  test("DELETE /purchases — 404 и 500", async () => {
    poolDefault();
    expect((await request(createApp()).delete("/api/admin/purchases/x").set(asAdmin())).status).toBe(400);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    expect((await request(createApp()).delete("/api/admin/purchases/9").set(asAdmin())).status).toBe(404);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).delete("/api/admin/purchases/1").set(asAdmin())).status).toBe(500);
  });

  test("PATCH participant — все ветки", async () => {
    poolDefault();
    expect(
      (await request(createApp()).patch("/api/admin/purchases/x/participants/2").set(asAdmin()).send({})).status
    ).toBe(400);

    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({ delivery_method: "bad" })
      ).status
    ).toBe(400);
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({ payment_method: "bad" })
      ).status
    ).toBe(400);
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({ delivery_address: "x".repeat(1001) })
      ).status
    ).toBe(400);
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({ delivery_comment: "x".repeat(1001) })
      ).status
    ).toBe(400);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({
      rows: [{ participant_status: "assembly", delivery_method: "courier", delivery_address: "" }],
    }));
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({ delivery_method: "courier" })
      ).status
    ).toBe(400);

    poolDefault();
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({
            participant_status: "handed",
            delivery_method: "pickup",
            payment_method: "sbp",
            delivery_comment: "ok",
          })
      ).status
    ).toBe(200);

    poolDefault();
    jest.spyOn(notifications, "notifyParticipantDeliveryStatusChange").mockRejectedValueOnce(new Error("n"));
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({ participant_status: "delivery" })
      ).status
    ).toBe(200);

    poolDefault();
    jest.spyOn(notifications, "notifyStatusChange").mockRejectedValueOnce(new Error("n"));
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({ participant_status: "handed" })
      ).status
    ).toBe(200);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(asAdmin())
          .send({ participant_status: "processing" })
      ).status
    ).toBe(500);
  });

  test("submissions и approve/reject", async () => {
    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).get("/api/admin/submissions").set(asAdmin())).status).toBe(500);

    poolDefault();
    expect((await request(createApp()).post("/api/admin/purchases/x/approve").set(asAdmin())).status).toBe(400);
    expect((await request(createApp()).post("/api/admin/purchases/x/reject").set(asAdmin())).status).toBe(400);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    expect((await request(createApp()).post("/api/admin/purchases/1/approve").set(asAdmin())).status).toBe(404);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [purchaseRow({ status: "collecting" })] }));
    expect((await request(createApp()).post("/api/admin/purchases/1/approve").set(asAdmin())).status).toBe(400);

    poolDefault();
    jest.spyOn(notifications, "createNotification").mockRejectedValueOnce(new Error("n"));
    expect((await request(createApp()).post("/api/admin/purchases/1/approve").set(asAdmin())).status).toBe(200);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).post("/api/admin/purchases/1/approve").set(asAdmin())).status).toBe(500);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockImplementationOnce(async () => ({ rows: [] }));
    expect((await request(createApp()).post("/api/admin/purchases/1/reject").set(asAdmin())).status).toBe(404);

    poolDefault();
    jest.spyOn(notifications, "createNotification").mockRejectedValueOnce(new Error("n"));
    expect((await request(createApp()).post("/api/admin/purchases/1/reject").set(asAdmin())).status).toBe(200);

    poolDefault();
    pool.query.mockImplementationOnce(async () => ({ rows: [{ is_admin: true }] }));
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).post("/api/admin/purchases/1/reject").set(asAdmin())).status).toBe(500);
  });
});
