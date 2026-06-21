jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const notifications = require("../../src/services/notifications");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");
const { futureDeadline, purchaseRow } = require("../helpers/routePool");

const validBody = {
  title: "Z",
  product_name: "P",
  unit_price: 50,
  min_participants: 1,
  deadline: futureDeadline(),
};

function joinPool(overrides = {}) {
  return async (sql, params) => {
    const s = String(sql);
    if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
      return {
        rows: [
          purchaseRow({
            organizer_id: 99,
            status: "collecting",
            min_participants: 2,
            ...overrides.purchase,
          }),
        ],
      };
    }
    if (s.includes("SELECT 1 FROM purchase_participants WHERE purchase_id")) {
      return { rows: overrides.existing ? [{ "?column?": 1 }] : [] };
    }
    if (s.includes("INSERT INTO purchase_participants")) return { rowCount: 1 };
    if (s.includes("COUNT(DISTINCT user_id)")) return { rows: [{ c: overrides.crowd ?? 2 }] };
    if (s.includes("UPDATE purchases SET status = 'closed'")) return { rowCount: 1 };
    if (s.includes("INNER JOIN purchase_participants px")) {
      return { rows: [purchaseRow({ my_quantity: 1, organizer_id: 99, ...overrides.purchase })] };
    }
    if (s.includes("SELECT name FROM users")) return { rows: [{ name: "U" }] };
    if (s.includes("participant_status = 'processing'")) return { rowCount: 1 };
    if (s.includes("INSERT INTO notifications")) {
      if (overrides.notifyFail) throw new Error("notify");
      return { rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };
}

describe("purchases routes — 100% coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    pool.query.mockReset();
    pool.connect.mockReset();
    pool.connect.mockResolvedValue({
      query: jest.fn(async (sql, params) => {
        if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(sql))) return { rows: [] };
        return pool.query(sql, params);
      }),
      release: jest.fn(),
    });
  });

  test("catalog — deal=all и 500", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ c: 1 }] })
      .mockResolvedValueOnce({ rows: [purchaseRow()] });
    expect((await request(createApp()).get("/api/purchases/catalog").query({ deal: "all" })).status).toBe(200);

    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).get("/api/purchases/catalog")).status).toBe(500);
  });

  test("checkout-requisites — 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect(
      (await request(createApp()).get("/api/purchases/checkout-requisites").query({ ids: "1" })).status
    ).toBe(500);
  });

  test("GET /:id — 500, admin viewer pending", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).get("/api/purchases/1")).status).toBe(500);

    pool.query
      .mockResolvedValueOnce({
        rows: [purchaseRow({ status: "pending_review", organizer_id: 99 })],
      })
      .mockResolvedValueOnce({ rows: [{ is_admin: true }] })
      .mockResolvedValueOnce({ rows: [] });
    const adminView = await request(createApp()).get("/api/purchases/1").set(authHeader({ id: 1, is_admin: true }));
    expect(adminView.status).toBe(200);
  });

  test("submit/create — ошибки и notify fail", async () => {
    expect((await request(createApp()).post("/api/purchases/submit").set(authHeader()).send({})).status).toBe(400);
    expect(
      (await request(createApp()).post("/api/purchases").set(authHeader()).send({ ...validBody, retail_price: -1 }))
        .status
    ).toBe(400);

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({
        rows: [{ ...purchaseRow(), id: 8, created_at: new Date(), updated_at: new Date() }],
      })
      .mockResolvedValueOnce({ rows: [{ name: "U" }] })
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockRejectedValueOnce(new Error("notify"));
    expect((await request(createApp()).post("/api/purchases/submit").set(authHeader()).send(validBody)).status).toBe(
      201
    );

    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).post("/api/purchases").set(authHeader()).send(validBody)).status).toBe(500);
  });

  test("PATCH status — все ветки", async () => {
    expect(
      (await request(createApp()).patch("/api/purchases/1/status").set(authHeader()).send({})).status
    ).toBe(400);
    expect(
      (await request(createApp()).patch("/api/purchases/1/status").set(authHeader()).send({ status: "nope" })).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT * FROM purchases WHERE id = $1")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    const missing = await request(createApp())
      .patch("/api/purchases/1/status")
      .set(authHeader())
      .send({ status: "closed" });
    expect(missing.status).toBe(404);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "collecting" })] };
      }
      return { rows: [], rowCount: 0 };
    });
    jest.spyOn(notifications, "notifyStatusChange").mockRejectedValueOnce(new Error("n"));
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "cancelled" })
      ).status
    ).toBe(200);

    pool.query.mockResolvedValueOnce({ rows: [purchaseRow({ organizer_id: 10, status: "closed" })] });
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "collecting" })
      ).status
    ).toBe(200);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "closed" })] };
      }
      if (String(sql).includes("UPDATE purchases SET status")) return { rowCount: 1 };
      if (String(sql).includes("FROM purchases p INNER JOIN users")) {
        return { rows: [purchaseRow({ status: "closed", organizer_id: 10 })] };
      }
      if (String(sql).includes("participant_status = 'processing'")) throw new Error("promote");
      return { rows: [], rowCount: 0 };
    });
    jest.spyOn(notifications, "notifyStatusChange").mockRejectedValueOnce(new Error("n"));
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "closed" })
      ).status
    ).toBe(200);

    pool.query.mockRejectedValueOnce(new Error("db"));
    expect(
      (await request(createApp()).patch("/api/purchases/1/status").set(authHeader()).send({ status: "closed" })).status
    ).toBe(500);
  });

  test("join — валидации и сценарии", async () => {
    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ participant_status: "bad" }))
        .status
    ).toBe(400);
    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ delivery_method: "bad" })).status
    ).toBe(400);
    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ payment_method: "bad" })).status
    ).toBe(400);
    expect(
      (
        await request(createApp())
          .post("/api/purchases/1/join")
          .set(authHeader())
          .send({ delivery_address: "x".repeat(1001) })
      ).status
    ).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return { rows: [purchaseRow({ status: "pending_review", organizer_id: 99 })] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({})).status).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("FROM purchases p WHERE p.id = $1")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({})).status).toBe(404);

    pool.query.mockImplementation(joinPool({ existing: true, purchase: { status: "completed" } }));
    expect((await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({})).status).toBe(400);

    pool.query.mockImplementation(joinPool({ existing: true, purchase: { status: "closed" } }));
    expect(
      (
        await request(createApp())
          .post("/api/purchases/1/join")
          .set(authHeader())
          .send({ delivery_method: "courier", delivery_address: "Addr", payment_method: "sbp" })
      ).status
    ).toBe(200);

    pool.query.mockImplementation(joinPool({ crowd: 2, notifyFail: true }));
    jest.spyOn(notifications, "notifyGroupDiscountReached").mockRejectedValueOnce(new Error("g"));
    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ delivery_method: "pickup" }))
        .status
    ).toBe(200);

    pool.query.mockImplementation(async () => {
      throw new Error("db");
    });
    expect((await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({})).status).toBe(500);
  });

  test("leave — все ветки", async () => {
    expect((await request(createApp()).delete("/api/purchases/x/join").set(authHeader())).status).toBe(400);

    pool.query.mockResolvedValueOnce({ rows: [] });
    expect((await request(createApp()).delete("/api/purchases/1/join").set(authHeader())).status).toBe(404);

    pool.query.mockResolvedValueOnce({ rows: [purchaseRow({ status: "completed" })] });
    expect((await request(createApp()).delete("/api/purchases/1/join").set(authHeader())).status).toBe(400);

    pool.query
      .mockResolvedValueOnce({ rows: [purchaseRow({ status: "closed", min_participants: 3 })] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ c: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ name: "L" }] });
    jest.spyOn(notifications, "createNotification").mockRejectedValueOnce(new Error("n"));
    expect((await request(createApp()).delete("/api/purchases/1/join").set(authHeader())).status).toBe(200);

    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).delete("/api/purchases/1/join").set(authHeader())).status).toBe(500);
  });

  test("reviews — 500, mapReview null, comment length", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).get("/api/purchases/1/reviews")).status).toBe(500);

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ avg_rating: 0, total: 0 }] })
      .mockResolvedValueOnce({ rows: [null] });
    const list = await request(createApp()).get("/api/purchases/1/reviews");
    expect(list.status).toBe(200);

    expect(
      (
        await request(createApp())
          .post("/api/purchases/1/reviews")
          .set(authHeader())
          .send({ rating: 5, comment: "x".repeat(2001) })
      ).status
    ).toBe(400);

    pool.query.mockRejectedValueOnce(new Error("db"));
    expect(
      (await request(createApp()).post("/api/purchases/1/reviews").set(authHeader()).send({ rating: 5 })).status
    ).toBe(500);
  });

  test("discussion — 500, mapDiscussionMessage null, notify", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).get("/api/purchases/1/discussion")).status).toBe(500);

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [null] });
    expect((await request(createApp()).get("/api/purchases/1/discussion")).status).toBe(200);

    pool.query
      .mockResolvedValueOnce({ rows: [purchaseRow({ organizer_id: 99, status: "collecting" })] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, purchase_id: 1, user_id: 1, body: "Hi", created_at: new Date() }],
      })
      .mockResolvedValueOnce({ rows: [{ name: "A", email: "a@t.ru", avatar_url: "" }] });
    jest.spyOn(notifications, "createNotification").mockRejectedValueOnce(new Error("n"));
    expect(
      (await request(createApp()).post("/api/purchases/1/discussion").set(authHeader()).send({ body: "Hello" })).status
    ).toBe(201);

    expect(
      (
        await request(createApp())
          .post("/api/purchases/1/discussion")
          .set(authHeader())
          .send({ body: "x".repeat(4001) })
      ).status
    ).toBe(400);

    pool.query.mockRejectedValueOnce(new Error("db"));
    expect(
      (await request(createApp()).post("/api/purchases/1/discussion").set(authHeader()).send({ body: "Hi" })).status
    ).toBe(500);
  });

  test("mine — 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).get("/api/purchases/mine").set(authHeader())).status).toBe(500);
  });

  test("GET / list — 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    expect((await request(createApp()).get("/api/purchases")).status).toBe(500);
  });
});
