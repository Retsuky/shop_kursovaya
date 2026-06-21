jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const notifications = require("../../src/services/notifications");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { adminPurchaseRow, futureDeadline, purchaseRow, userRow } = require("../helpers/routePool");

function adminOk(impl) {
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql);
    if (s.includes("SELECT is_admin FROM users WHERE id = $1") && !s.includes("DELETE")) {
      return { rows: [{ is_admin: true }] };
    }
    return impl(s, params);
  });
  pool.connect.mockResolvedValue({
    query: jest.fn(async (sql, params) => {
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(sql))) return { rows: [] };
      return pool.query(sql, params);
    }),
    release: jest.fn(),
  });
}

describe("routes — оставшиеся ветки", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  test("admin — 500 users/purchases/delete user", async () => {
    adminOk((s) => {
      if (s.includes("FROM users ORDER BY")) throw new Error("db");
      throw new Error("unexpected");
    });
    expect((await request(createApp()).get("/api/admin/users").set(authHeader())).status).toBe(500);

    adminOk((s) => {
      if (s.includes("FROM purchases p") && s.includes("NOT IN")) throw new Error("db");
      throw new Error("unexpected");
    });
    expect((await request(createApp()).get("/api/admin/purchases").set(authHeader())).status).toBe(500);

    adminOk((s) => {
      if (s.includes("COUNT(*)::int AS c FROM users WHERE is_admin")) return { rows: [{ c: 2 }] };
      if (s.includes("SELECT is_admin FROM users WHERE id = $1") && s.includes("DELETE")) {
        return { rows: [{ is_admin: false }] };
      }
      if (s.includes("DELETE FROM users WHERE id = $1")) throw new Error("db");
      throw new Error("unexpected");
    });
    expect((await request(createApp()).delete("/api/admin/users/5").set(authHeader())).status).toBe(500);
  });

  test("admin — PATCH purchase retail_price и notify/promote fail", async () => {
    adminOk((s, params) => {
      if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
        return { rows: [{ id: params[0], status: "collecting" }] };
      }
      if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow({ status: "closed" })] };
      }
      if (s.includes("SELECT id FROM users WHERE id = $1")) return { rows: [{ id: params[0] }] };
      if (s.includes("participant_status = 'processing'")) throw new Error("promote");
      return { rows: [], rowCount: 0 };
    });
    jest.spyOn(notifications, "notifyStatusChange").mockRejectedValueOnce(new Error("n"));
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1")
          .set(authHeader())
          .send({ retail_price: 150, status: "closed" })
      ).status
    ).toBe(200);

    adminOk((s, params) => {
      if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
        return { rows: [{ id: params[0], status: "collecting" }] };
      }
      if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow({ status: "closed" })] };
      }
      if (s.includes("participant_status = 'processing'")) throw new Error("promote");
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(authHeader()).send({ status: "closed" })).status
    ).toBe(200);
  });

  test("admin — participant notify fail и auto-complete notify fail", async () => {
    adminOk((s) => {
      if (s.includes("participant_status") && s.includes("FROM purchase_participants")) {
        return {
          rows: [{ participant_status: "assembly", delivery_method: "pickup", delivery_address: "a" }],
        };
      }
      if (s.includes("UPDATE purchase_participants")) return { rowCount: 1 };
      if (s.includes("COUNT(*)::int AS total")) return { rows: [{ total: 1, handed: 1 }] };
      if (s.includes("SELECT status FROM purchases WHERE id = $1")) return { rows: [{ status: "closed" }] };
      if (s.includes("UPDATE purchases SET status = 'completed'")) return { rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    jest.spyOn(notifications, "notifyParticipantDeliveryStatusChange").mockRejectedValueOnce(new Error("n"));
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ participant_status: "handed" })
      ).status
    ).toBe(200);

    jest.spyOn(notifications, "notifyStatusChange").mockRejectedValueOnce(new Error("n"));
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ participant_status: "handed" })
      ).status
    ).toBe(200);
  });

  test("auth — avatar null и payment null", async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [userRow({ avatar_url: null, payment_details: null })],
      });
    const av = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ avatar_url: null });
    expect(av.status).toBe(200);

    pool.query
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [userRow()] });
    const pay = await request(createApp())
      .patch("/api/auth/profile")
      .set(authHeader())
      .send({ payment_details: null });
    expect(pay.status).toBe(200);
  });

  test("notifications — полные поля", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          user_id: 1,
          purchase_id: 2,
          type: "x",
          title: "T",
          body: null,
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const res = await request(createApp()).get("/api/notifications").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.items[0].body).toBe("");
  });

  test("purchases — catalog closed_group, submit 500, join edges", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ c: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    expect(
      (await request(createApp()).get("/api/purchases/catalog").query({ deal: "closed_group" })).status
    ).toBe(200);

    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).post("/api/purchases/submit").set(authHeader()).send({
      title: "T",
      product_name: "P",
      unit_price: 1,
      min_participants: 1,
      deadline: futureDeadline(),
    })).status).toBe(500);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return { rows: [purchaseRow({ status: "collecting", organizer_id: 99 })] };
      }
      if (s.includes("SELECT 1 FROM purchase_participants")) return { rows: [{ x: 1 }] };
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .post("/api/purchases/1/join")
          .set(authHeader())
          .send({ delivery_method: "pickup", delivery_comment: "x".repeat(1001) })
      ).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("FROM purchases p WHERE p.id = $1")) {
        return { rows: [purchaseRow({ status: "collecting", organizer_id: 99 })] };
      }
      if (String(sql).includes("SELECT 1 FROM purchase_participants")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).post("/api/purchases/abc/join").set(authHeader()).send({})).status).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return { rows: [purchaseRow({ status: "completed", organizer_id: 99 })] };
      }
      if (s.includes("SELECT 1 FROM purchase_participants")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({})).status).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "collecting" })] };
      }
      if (s.includes("UPDATE purchases SET status")) return { rowCount: 1 };
      if (s.includes("FROM purchases p INNER JOIN users")) {
        return { rows: [purchaseRow({ organizer_id: 10 })] };
      }
      if (s.includes("participant_status = 'processing'")) throw new Error("p");
      return { rows: [], rowCount: 0 };
    });
    jest.spyOn(notifications, "notifyStatusChange").mockRejectedValueOnce(new Error("n"));
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "invalid_status_xyz" })
      ).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "closed" })] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "completed" })
      ).status
    ).toBe(200);
  });

  test("purchases — reviews/discussion gaps", async () => {
    expect((await request(createApp()).get("/api/purchases/x/reviews")).status).toBe(400);
    expect(
      (await request(createApp()).post("/api/purchases/1/reviews").set(authHeader()).send({ rating: 0 })).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT id FROM purchases WHERE id = $1")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).get("/api/purchases/1/discussion")).status).toBe(404);
    expect((await request(createApp()).get("/api/purchases/x/discussion")).status).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT id, title, organizer_id, status FROM purchases")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).post("/api/purchases/1/discussion").set(authHeader()).send({ body: "Hi" })).status
    ).toBe(404);

    pool.query
      .mockResolvedValueOnce({ rows: [purchaseRow({ organizer_id: 1, status: "collecting" })] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, purchase_id: 1, user_id: 1, body: "Hi", created_at: new Date() }],
      })
      .mockResolvedValueOnce({ rows: [{ name: "Me", email: "m@t.ru", avatar_url: "" }] });
    expect(
      (await request(createApp()).post("/api/purchases/1/discussion").set(authHeader({ id: 1 })).send({ body: "Own" }))
        .status
    ).toBe(201);
  });

  test("purchases — submit notify admin fail", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ ...purchaseRow(), id: 3, created_at: new Date(), updated_at: new Date() }],
      })
      .mockResolvedValueOnce({ rows: [{ name: "U" }] })
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockRejectedValueOnce(new Error("notify"));
    expect(
      (
        await request(createApp()).post("/api/purchases/submit").set(authHeader()).send({
          title: "T",
          product_name: "P",
          unit_price: 1,
          min_participants: 1,
          deadline: futureDeadline(),
        })
      ).status
    ).toBe(201);
  });

  test("purchases — join notify fail и leave notify", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return { rows: [purchaseRow({ organizer_id: 99, status: "collecting", min_participants: 1 })] };
      }
      if (s.includes("SELECT 1 FROM purchase_participants")) return { rows: [] };
      if (s.includes("INSERT INTO purchase_participants")) return { rowCount: 1 };
      if (s.includes("COUNT(DISTINCT user_id)")) return { rows: [{ c: 1 }] };
      if (s.includes("INNER JOIN purchase_participants px")) {
        return { rows: [purchaseRow({ my_quantity: 1, organizer_id: 99 })] };
      }
      if (s.includes("SELECT name FROM users")) return { rows: [{ name: "J" }] };
      if (s.includes("INSERT INTO notifications")) throw new Error("notify");
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ delivery_method: "pickup" }))
        .status
    ).toBe(200);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ status: "collecting" })] };
      }
      if (s.includes("DELETE FROM purchase_participants")) return { rows: [{ id: 1 }] };
      if (s.includes("COUNT(DISTINCT user_id)")) return { rows: [{ c: 0 }] };
      if (s.includes("SELECT name FROM users")) return { rows: [{ name: "L" }] };
      if (s.includes("INSERT INTO notifications")) throw new Error("notify");
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).delete("/api/purchases/1/join").set(authHeader())).status).toBe(200);
  });
});
