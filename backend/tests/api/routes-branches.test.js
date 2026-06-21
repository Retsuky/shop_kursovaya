jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
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

describe("routes — ветки map/nullish", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  test("admin — mapPurchase, normalizeParticipantStatus, last admin", async () => {
    adminOk((s, params) => {
      if (s.includes("FROM users ORDER BY")) return { rows: [userRow()] };
      if (s.includes("FROM purchases p") && s.includes("NOT IN")) {
        return {
          rows: [
            adminPurchaseRow({
              description: null,
              unit_price: null,
              city: null,
              pickup_address: null,
              participant_count: null,
              total_quantity: null,
              category: null,
              image_url: null,
              retail_price: null,
            }),
            null,
          ],
        };
      }
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow()] };
      }
      if (s.includes("FROM purchase_participants pp") && s.includes("user_email")) {
        return {
          rows: [
            {
              user_id: 2,
              quantity: null,
              participant_status: "collecting",
              delivery_method: null,
              payment_method: null,
              delivery_address: null,
              delivery_comment: null,
              user_name: "U",
              user_email: "u@t.ru",
              avatar_url: "",
              paid_at: "2024-01-01T00:00:00.000Z",
            },
            {
              user_id: 3,
              quantity: 2,
              participant_status: "completed",
              delivery_method: "courier",
              payment_method: "sbp",
              delivery_address: "A",
              delivery_comment: "C",
              user_name: "V",
              user_email: "v@t.ru",
              avatar_url: "",
              paid_at: new Date("2024-06-01"),
            },
            {
              user_id: 4,
              quantity: 1,
              participant_status: null,
              delivery_method: "pickup",
              payment_method: "card",
              delivery_address: "",
              delivery_comment: "",
              user_name: "W",
              user_email: "w@t.ru",
              avatar_url: "",
              paid_at: null,
            },
          ],
        };
      }
      if (s.includes("SELECT id, is_admin FROM users WHERE id = $1")) {
        return { rows: [{ id: params[0], is_admin: true }] };
      }
      if (s.includes("COUNT(*)::int AS c FROM users WHERE is_admin = TRUE")) {
        return { rows: [{}] };
      }
      if (s.includes("SELECT is_admin FROM users WHERE id = $1") && s.includes("DELETE")) {
        return { rows: [{ is_admin: true }] };
      }
      if (s.includes("COUNT(*)::int AS c FROM users WHERE is_admin")) {
        return { rows: [{}] };
      }
      if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
        return { rows: [{ id: params[0], status: "pending_review" }] };
      }
      if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
      if (s.includes("SELECT id FROM users WHERE id = $1")) return { rows: [{ id: params[0] }] };
      return { rows: [], rowCount: 0 };
    });

    const catalog = await request(createApp()).get("/api/admin/purchases").set(authHeader());
    expect(catalog.status).toBe(200);
    expect(catalog.body[0].description).toBe("");
    expect(catalog.body[1]).toBeNull();

    const detail = await request(createApp()).get("/api/admin/purchases/1").set(authHeader());
    expect(detail.status).toBe(200);
    expect(detail.body.participants[0].participant_status).toBe("assembly");
    expect(detail.body.participants[1].participant_status).toBe("handed");
    expect(detail.body.participants[2].participant_status).toBe("assembly");

    expect(
      (await request(createApp()).patch("/api/admin/users/2").set(authHeader()).send({ is_admin: false })).status
    ).toBe(400);
    expect((await request(createApp()).delete("/api/admin/users/3").set(authHeader())).status).toBe(400);

    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1")
          .set(authHeader())
          .send({
            description: null,
            city: null,
            pickup_address: null,
            category: null,
            image_url: null,
            retail_price: null,
            status: "rejected",
          })
      ).status
    ).toBe(200);

    pool.query.mockImplementation(async (sql, params) => {
      const s = String(sql);
      if (s.includes("SELECT is_admin FROM users WHERE id = $1") && !s.includes("DELETE")) {
        return { rows: [{ is_admin: true }] };
      }
      if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
        return { rows: [{ id: params[0], status: "collecting" }] };
      }
      if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow({ status: "closed" })] };
      }
      if (s.includes("FROM purchases WHERE id = $1") && s.includes("organizer_id")) {
        return { rows: [{ id: 1, organizer_id: 10, title: "T" }] };
      }
      if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
      if (s.includes("SELECT DISTINCT user_id FROM purchase_participants")) return { rows: [] };
      if (s.includes("participant_status = 'processing'")) return { rowCount: 1 };
      if (s.includes("INSERT INTO notifications")) return { rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    pool.connect.mockResolvedValue({
      query: jest.fn(async (sql, params) => {
        if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(sql))) return { rows: [] };
        return pool.query(sql, params);
      }),
      release: jest.fn(),
    });
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(authHeader()).send({ status: "closed" })).status
    ).toBe(200);
  });

  test("admin — participant patch optional поля", async () => {
    adminOk((s, params) => {
      if (s.includes("COUNT(*)::int AS total")) return { rows: [{ total: 0, handed: 0 }] };
      if (s.includes("participant_status") && s.includes("AND user_id = $2")) {
        return {
          rows: [{ participant_status: "handed", delivery_method: "pickup", delivery_address: "x" }],
        };
      }
      if (s.includes("UPDATE purchase_participants")) return { rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ delivery_method: "pickup" })
      ).status
    ).toBe(200);
  });

  test("purchases — mapPurchase и catalog ветки", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("COUNT(*)::int AS c") && s.includes("FROM purchases")) {
        return { rows: [{ c: 1 }] };
      }
      if (s.includes("FROM purchases p") && s.includes("participant_preview")) {
        return {
          rows: [
            purchaseRow({
              description: null,
              unit_price: null,
              organizer_payment_details: null,
              participant_count: null,
              total_quantity: null,
              category: null,
              image_url: null,
              retail_price: null,
              my_quantity: "",
              my_participant_status: "  ",
            }),
          ],
        };
      }
      if (s.includes("SELECT id FROM purchases WHERE id = $1")) return { rows: [{ id: 1 }] };
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("my_quantity")) {
        return {
          rows: [
            purchaseRow({
              my_quantity: 3,
              my_participant_status: "collecting",
              my_delivery_method: null,
              my_payment_method: null,
              my_delivery_address: null,
              my_delivery_comment: null,
            }),
          ],
        };
      }
      if (s.includes("SELECT is_admin FROM users")) return { rows: [{ is_admin: false }] };
      return { rows: [], rowCount: 0 };
    });

    expect((await request(createApp()).get("/api/purchases/catalog").query({ deal: "hot" })).status).toBe(200);
    expect((await request(createApp()).get("/api/purchases/1").set(authHeader())).status).toBe(200);
  });

  test("purchases — join/leave/checkout mapReview ветки", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return {
          rows: [
            purchaseRow({
              organizer_id: 99,
              status: "collecting",
              min_participants: 1,
              unit_price: null,
            }),
          ],
        };
      }
      if (s.includes("SELECT 1 FROM purchase_participants")) return { rows: [] };
      if (s.includes("INSERT INTO purchase_participants")) return { rowCount: 1 };
      if (s.includes("COUNT(DISTINCT user_id)")) return { rows: [{ c: 1 }] };
      if (s.includes("INNER JOIN purchase_participants px")) {
        return { rows: [purchaseRow({ my_quantity: null, organizer_id: 99 })] };
      }
      if (s.includes("SELECT name FROM users")) return { rows: [{ name: "J" }] };
      if (s.includes("INSERT INTO notifications")) return { rowCount: 1 };
      if (s.includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10 })] };
      }
      if (s.includes("SELECT 1 FROM purchase_participants WHERE purchase_id = $1 AND user_id = $2")) {
        return { rows: [] };
      }
      if (s.includes("INSERT INTO purchase_reviews")) {
        return {
          rows: [
            {
              id: 1,
              purchase_id: 1,
              user_id: 1,
              rating: 5,
              comment: null,
              created_at: new Date(),
              user_name: null,
              avatar_url: null,
            },
          ],
        };
      }
      if (s.includes("SELECT id, name") && s.includes("avatar_url")) {
        return { rows: [{ name: "R", avatar_url: "" }] };
      }
      if (s.includes("SELECT payment_details")) {
        return { rows: [{ payment_details: null, name: "O" }] };
      }
      if (s.includes("parsePgIntIdList") || (s.includes("organizer_id") && s.includes("payment_details"))) {
        return { rows: [{ id: 1, organizer_id: 10, payment_details: "  pay  ", title: "T" }] };
      }
      if (s.includes("FROM purchases p INNER JOIN users u ON u.id = p.organizer_id") && s.includes("WHERE p.id = ANY")) {
        return { rows: [{ id: 1, organizer_id: 10, payment_details: null, title: "T" }] };
      }
      return { rows: [], rowCount: 0 };
    });

    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ delivery_method: "pickup" }))
        .status
    ).toBe(200);

    expect(
      (await request(createApp()).post("/api/purchases/1/reviews").set(authHeader()).send({ rating: 5 })).status
    ).toBe(403);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 1 })] };
      }
      if (s.includes("SELECT 1 FROM purchase_participants WHERE purchase_id = $1 AND user_id = $2")) {
        return { rows: [{ x: 1 }] };
      }
      if (s.includes("INSERT INTO purchase_reviews")) {
        return {
          rows: [
            {
              id: 1,
              purchase_id: 1,
              user_id: 1,
              rating: 4,
              comment: "ok",
              created_at: new Date(),
              user_name: "Me",
              avatar_url: "",
            },
          ],
        };
      }
      if (s.includes("SELECT id, name") && s.includes("avatar_url")) {
        return { rows: [{ name: "Me", avatar_url: "" }] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).post("/api/purchases/1/reviews").set(authHeader({ id: 1 })).send({ rating: 4 })).status
    ).toBe(201);

    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 10, payment_details: "x", title: "T" }] });
    expect(
      (await request(createApp()).get("/api/purchases/checkout-requisites").query({ ids: "1" }).set(authHeader())).status
    ).toBe(200);
  });

  test("notifications — limit NaN, границы и без query", async () => {
    pool.query.mockImplementation(async (_sql, params) => {
      return { rows: [], limitParam: params[1] };
    });
    await request(createApp()).get("/api/notifications").set(authHeader());
    const r0 = await request(createApp()).get("/api/notifications").query({ limit: "abc" }).set(authHeader());
    expect(r0.status).toBe(200);
    const r1 = await request(createApp()).get("/api/notifications").query({ limit: "0" }).set(authHeader());
    expect(r1.status).toBe(200);
    const r2 = await request(createApp()).get("/api/notifications").query({ limit: "999" }).set(authHeader());
    expect(r2.status).toBe(200);
    const r3 = await request(createApp()).get("/api/notifications").query({ limit: "2.9" }).set(authHeader());
    expect(r3.status).toBe(200);
  });
});
