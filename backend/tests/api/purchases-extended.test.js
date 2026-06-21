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

describe("purchases API — расширенное покрытие", () => {
  beforeEach(() => jest.clearAllMocks());

  test("GET /catalog — 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).get("/api/purchases/catalog");
    expect(res.status).toBe(500);
  });

  test("GET / — 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).get("/api/purchases");
    expect(res.status).toBe(500);
  });

  test("GET /mine — 500", async () => {
    pool.query.mockRejectedValueOnce(new Error("db"));
    const res = await request(createApp()).get("/api/purchases/mine").set(authHeader());
    expect(res.status).toBe(500);
  });

  test("GET /mine — успех с joined", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [purchaseRow()] })
      .mockResolvedValueOnce({
        rows: [
          purchaseRow({
            my_quantity: 1,
            my_participant_status: "collecting",
            organizer_id: 99,
          }),
        ],
      });
    const res = await request(createApp()).get("/api/purchases/mine").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.joined).toHaveLength(1);
  });

  test("GET /checkout-requisites — группировка", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          purchase_id: 1,
          purchase_title: "A",
          organizer_id: 10,
          organizer_name: "Org",
          payment_details: "123",
        },
        {
          purchase_id: 2,
          purchase_title: "B",
          organizer_id: 10,
          organizer_name: "Org",
          payment_details: "123",
        },
      ],
    });
    const res = await request(createApp()).get("/api/purchases/checkout-requisites").query({ ids: "1,2" });
    expect(res.status).toBe(200);
    expect(res.body.organizers[0].purchases).toHaveLength(2);
  });

  test("GET /:id — с участниками и датами", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [purchaseRow()] })
      .mockResolvedValueOnce({
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
            email: "u@t.ru",
            avatar_url: "",
            joined_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });
    const res = await request(createApp()).get("/api/purchases/1");
    expect(res.status).toBe(200);
    expect(res.body.participants).toHaveLength(1);
  });

  test("PATCH status — запреты и переходы", async () => {
    pool.query.mockResolvedValueOnce({ rows: [purchaseRow({ organizer_id: 10, status: "completed" })] });
    const back = await request(createApp())
      .patch("/api/purchases/1/status")
      .set(authHeader({ id: 10 }))
      .send({ status: "collecting" });
    expect(back.status).toBe(400);

    pool.query.mockResolvedValueOnce({ rows: [purchaseRow({ organizer_id: 10, status: "cancelled" })] });
    const cancelled = await request(createApp())
      .patch("/api/purchases/1/status")
      .set(authHeader({ id: 10 }))
      .send({ status: "closed" });
    expect(cancelled.status).toBe(400);

    pool.query.mockResolvedValueOnce({ rows: [purchaseRow({ organizer_id: 99, status: "collecting" })] });
    const forbidden = await request(createApp())
      .patch("/api/purchases/1/status")
      .set(authHeader({ id: 10 }))
      .send({ status: "closed" });
    expect(forbidden.status).toBe(403);
  });

  test("join — organizer и deadline", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return {
          rows: [
            purchaseRow({
              organizer_id: 10,
              status: "collecting",
              deadline: new Date(Date.now() - 86400000).toISOString(),
            }),
          ],
        };
      }
      if (s.includes("SELECT 1 FROM purchase_participants WHERE purchase_id")) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 0 };
    });
    const expired = await request(createApp())
      .post("/api/purchases/1/join")
      .set(authHeader({ id: 5 }))
      .send({ delivery_method: "pickup" });
    expect(expired.status).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "collecting" })] };
      }
      if (s.includes("SELECT 1 FROM purchase_participants WHERE purchase_id")) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 0 };
    });
    const org = await request(createApp())
      .post("/api/purchases/1/join")
      .set(authHeader({ id: 10 }))
      .send({ delivery_method: "pickup" });
    expect(org.status).toBe(400);
  });

  test("leave — не участник", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [purchaseRow({ status: "collecting" })] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(createApp()).delete("/api/purchases/1/join").set(authHeader());
    expect(res.status).toBe(400);
  });

  test("reviews — 404 и 403", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const missing = await request(createApp()).get("/api/purchases/1/reviews");
    expect(missing.status).toBe(404);

    pool.query
      .mockResolvedValueOnce({ rows: [purchaseRow({ organizer_id: 99 })] })
      .mockResolvedValueOnce({ rows: [] });
    const forbidden = await request(createApp())
      .post("/api/purchases/1/reviews")
      .set(authHeader({ id: 5 }))
      .send({ rating: 5 });
    expect(forbidden.status).toBe(403);
  });

  test("discussion — cancelled", async () => {
    pool.query.mockResolvedValueOnce({ rows: [purchaseRow({ status: "cancelled" })] });
    const res = await request(createApp())
      .post("/api/purchases/1/discussion")
      .set(authHeader())
      .send({ body: "Hi" });
    expect(res.status).toBe(400);
  });

  test("parsePurchaseBody — min и deadline", async () => {
    const badMin = await request(createApp())
      .post("/api/purchases")
      .set(authHeader())
      .send({ ...validBody, min_participants: 0 });
    expect(badMin.status).toBe(400);

    const badDate = await request(createApp())
      .post("/api/purchases")
      .set(authHeader())
      .send({ ...validBody, deadline: "not-a-date" });
    expect(badDate.status).toBe(400);
  });
});
