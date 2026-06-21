jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { adminPurchaseRow, futureDeadline, purchaseRow } = require("../helpers/routePool");

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

function notifyAudienceMocks(s, params) {
  if (s.includes("FROM purchases WHERE id = $1") && s.includes("organizer_id")) {
    return { rows: [{ id: params?.[0] ?? 1, organizer_id: 10, title: "T" }] };
  }
  if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
  if (s.includes("SELECT DISTINCT user_id FROM purchase_participants")) return { rows: [{ user_id: 2 }] };
  return null;
}

function failOnNotificationInsert(impl) {
  return async (s, params) => {
    if (String(s).includes("INSERT INTO notifications")) {
      throw new Error("notify fail");
    }
    const audience = notifyAudienceMocks(String(s), params);
    if (audience) return audience;
    return impl(s, params);
  };
}

describe("routes — финальное покрытие catch-блоков", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  test("admin — notify/promote/auto-complete/approve/reject catch", async () => {
    adminOk(
      failOnNotificationInsert((s, params) => {
        if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
          return { rows: [{ id: params[0], status: "collecting" }] };
        }
        if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
        if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
          return { rows: [adminPurchaseRow({ status: "closed" })] };
        }
        if (s.includes("SELECT id FROM users WHERE id = $1")) return { rows: [{ id: params[0] }] };
        if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
        return { rows: [], rowCount: 0 };
      })
    );
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(authHeader()).send({ status: "closed" })).status
    ).toBe(200);

    adminOk((s, params) => {
      if (s.includes("COUNT(*)::int AS total")) return { rows: [{ total: 1, handed: 1 }] };
      if (s.includes("participant_status") && s.includes("AND user_id = $2")) {
        return { rows: [{ participant_status: "assembly", delivery_method: "pickup", delivery_address: "a" }] };
      }
      if (s.includes("UPDATE purchase_participants")) return { rowCount: 1 };
      if (s.includes("SELECT status FROM purchases WHERE id = $1")) return { rows: [{ status: "closed" }] };
      if (s.includes("UPDATE purchases SET status = 'completed'")) return { rowCount: 1 };
      if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
      if (s.includes("INSERT INTO notifications")) throw new Error("notify");
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ participant_status: "handed" })
      ).status
    ).toBe(200);

    adminOk((s, params) => {
      const audience = notifyAudienceMocks(s, params);
      if (audience) return audience;
      if (s.includes("COUNT(*)::int AS total")) return { rows: [{ total: 1, handed: 1 }] };
      if (s.includes("participant_status") && s.includes("AND user_id = $2")) {
        return { rows: [{ participant_status: "assembly", delivery_method: "pickup", delivery_address: "a" }] };
      }
      if (s.includes("UPDATE purchase_participants")) return { rowCount: 1 };
      if (s.includes("SELECT status FROM purchases WHERE id = $1")) return { rows: [{ status: "closed" }] };
      if (s.includes("UPDATE purchases SET status = 'completed'")) return { rowCount: 1 };
      if (s.includes("INSERT INTO notifications")) throw new Error("auto-complete notify");
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ participant_status: "handed" })
      ).status
    ).toBe(200);

    adminOk((s, params) => {
      if (s.includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ status: "pending_review", organizer_id: 10 })] };
      }
      if (s.includes("UPDATE purchases SET status = 'collecting'")) return { rowCount: 1 };
      if (s.includes("INSERT INTO notifications")) throw new Error("approve notify");
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow({ status: "collecting" })] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).post("/api/admin/purchases/1/approve").set(authHeader())).status).toBe(200);

    adminOk((s, params) => {
      if (s.includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ status: "pending_review", organizer_id: 10 })] };
      }
      if (s.includes("UPDATE purchases SET status = 'rejected'")) return { rowCount: 1 };
      if (s.includes("INSERT INTO notifications")) throw new Error("reject notify");
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow({ status: "rejected" })] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).post("/api/admin/purchases/1/reject").set(authHeader())).status).toBe(200);
  });

  test("admin — promote catch при закрытии", async () => {
    adminOk((s, params) => {
      if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
        return { rows: [{ id: params[0], status: "collecting" }] };
      }
      if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow({ status: "closed" })] };
      }
      if (s.includes("participant_status = 'processing'")) throw new Error("promote");
      if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(authHeader()).send({ status: "closed" })).status
    ).toBe(200);
  });

  test("purchases — status/join/reviews/discussion catch", async () => {
    pool.query.mockImplementation(
      failOnNotificationInsert(async (sql) => {
        const s = String(sql);
        if (s.includes("SELECT * FROM purchases WHERE id = $1")) {
          return { rows: [purchaseRow({ organizer_id: 10, status: "collecting" })] };
        }
        if (s.includes("UPDATE purchases SET status")) return { rowCount: 1 };
        if (s.includes("FROM purchases p INNER JOIN users")) {
          return { rows: [purchaseRow({ organizer_id: 10, status: "cancelled" })] };
        }
        if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
        return { rows: [], rowCount: 0 };
      })
    );
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "cancelled" })
      ).status
    ).toBe(200);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "pending_review" })] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "closed" })
      ).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "collecting" })] };
      }
      if (s.includes("UPDATE purchases SET status")) return { rowCount: 1 };
      if (s.includes("participant_status = 'processing'")) throw new Error("promote");
      if (s.includes("FROM purchases p INNER JOIN users")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "closed" })] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "closed" })
      ).status
    ).toBe(200);

    pool.query.mockImplementation(
      failOnNotificationInsert(async (sql) => {
        const s = String(sql);
        if (s.includes("SELECT * FROM purchases WHERE id = $1")) {
          return { rows: [purchaseRow({ organizer_id: 10, status: "collecting" })] };
        }
        if (s.includes("UPDATE purchases SET status")) return { rowCount: 1 };
        if (s.includes("participant_status = 'processing'")) return { rowCount: 1 };
        if (s.includes("FROM purchases p INNER JOIN users")) {
          return { rows: [purchaseRow({ organizer_id: 10, status: "closed" })] };
        }
        if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
        return { rows: [], rowCount: 0 };
      })
    );
    pool.connect.mockResolvedValue({
      query: jest.fn(async (sql, params) => {
        if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(sql))) return { rows: [] };
        return pool.query(sql, params);
      }),
      release: jest.fn(),
    });
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "closed" })
      ).status
    ).toBe(200);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return { rows: [purchaseRow({ organizer_id: 99, status: "collecting", min_participants: 1 })] };
      }
      if (s.includes("SELECT 1 FROM purchase_participants")) return { rows: [] };
      if (s.includes("INSERT INTO purchase_participants")) return { rowCount: 1 };
      if (s.includes("COUNT(DISTINCT user_id)")) return { rows: [{ c: 1 }] };
      if (s.includes("UPDATE purchases SET status = 'closed'")) return { rowCount: 1 };
      if (s.includes("participant_status = 'processing'")) throw new Error("promote");
      if (s.includes("INNER JOIN purchase_participants px")) {
        return { rows: [purchaseRow({ my_quantity: 1, organizer_id: 99 })] };
      }
      if (s.includes("SELECT name FROM users")) return { rows: [{ name: "J" }] };
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ delivery_method: "pickup" }))
        .status
    ).toBe(200);

    pool.query.mockImplementation(
      failOnNotificationInsert(async (sql) => {
        const s = String(sql);
        if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
          return { rows: [purchaseRow({ organizer_id: 99, status: "collecting", min_participants: 1 })] };
        }
        if (s.includes("SELECT 1 FROM purchase_participants")) return { rows: [] };
        if (s.includes("INSERT INTO purchase_participants")) return { rowCount: 1 };
        if (s.includes("COUNT(DISTINCT user_id)")) return { rows: [{ c: 1 }] };
        if (s.includes("UPDATE purchases SET status = 'closed'")) return { rowCount: 1 };
        if (s.includes("participant_status = 'processing'")) return { rowCount: 1 };
        if (s.includes("INNER JOIN purchase_participants px")) {
          return { rows: [purchaseRow({ my_quantity: 1, organizer_id: 99 })] };
        }
        if (s.includes("SELECT name FROM users")) return { rows: [{ name: "J" }] };
        if (s.includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
        return { rows: [], rowCount: 0 };
      })
    );
    pool.connect.mockResolvedValue({
      query: jest.fn(async (sql, params) => {
        if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(sql))) return { rows: [] };
        return pool.query(sql, params);
      }),
      release: jest.fn(),
    });
    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ delivery_method: "pickup" }))
        .status
    ).toBe(200);

    expect(
      (await request(createApp()).post("/api/purchases/x/reviews").set(authHeader()).send({ rating: 5 })).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).post("/api/purchases/1/reviews").set(authHeader()).send({ rating: 5 })).status
    ).toBe(404);

    expect(
      (await request(createApp()).post("/api/purchases/x/discussion").set(authHeader()).send({ body: "Hi" })).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT id, title, organizer_id, status FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 99, status: "collecting" })] };
      }
      if (s.includes("INSERT INTO purchase_discussion_messages")) {
        return { rows: [{ id: 1, purchase_id: 1, user_id: 1, body: "Hi", created_at: new Date() }] };
      }
      if (s.includes("SELECT name, email")) return { rows: [{ name: "A", email: "a@t.ru", avatar_url: "" }] };
      if (s.includes("INSERT INTO notifications")) throw new Error("discussion notify");
      return { rows: [], rowCount: 0 };
    });
    expect(
      (await request(createApp()).post("/api/purchases/1/discussion").set(authHeader()).send({ body: "Hello" })).status
    ).toBe(201);
  });

  test("notifications — limit по умолчанию и пустой unread-count", async () => {
    pool.query.mockImplementationOnce(async (sql, params) => {
      expect(String(sql)).toContain("FROM notifications");
      expect(params[1]).toBe(50);
      return { rows: [] };
    });
    const list = await request(createApp()).get("/api/notifications").set(authHeader());
    expect(list.status).toBe(200);

    pool.query.mockResolvedValueOnce({ rows: [{}] });
    const count = await request(createApp()).get("/api/notifications/unread-count").set(authHeader());
    expect(count.status).toBe(200);
    expect(count.body.count).toBe(0);
  });
});
