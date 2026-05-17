jest.mock("../../src/config/db", () => ({ query: jest.fn(), connect: jest.fn() }));

const request = require("supertest");
const pool = require("../../src/config/db");
const { createApp } = require("../helpers/createApp");
const { authHeader, signToken } = require("../helpers/auth");
const { purchaseRow, futureDeadline } = require("../helpers/mockPool");

const validBody = {
  title: "Закупка",
  product_name: "Товар",
  unit_price: 100,
  min_participants: 2,
  deadline: futureDeadline(),
};

function installDefaultPool() {
  pool.query.mockImplementation(async (sql) => {
    const s = String(sql);
    if (s.includes("COUNT(*)::int AS c FROM purchases p WHERE")) {
      return { rows: [{ c: 0 }] };
    }
    if (s.includes("SELECT") && s.includes("FROM purchases p") && s.includes("LIMIT")) {
      return { rows: [] };
    }
    if (s.includes("FROM purchases p") && s.includes("WHERE p.id = $1") && s.includes("organizer_name")) {
      return { rows: [purchaseRow()] };
    }
    if (s.includes("FROM purchases p") && s.includes("ORDER BY p.created_at DESC") && !s.includes("LIMIT")) {
      return { rows: [purchaseRow()] };
    }
    if (s.includes("FROM purchase_participants pp")) {
      return { rows: [] };
    }
    if (s.includes("SELECT id FROM purchases WHERE id = $1")) {
      return { rows: [{ id: 1 }] };
    }
    if (s.includes("FROM purchases WHERE id = $1") && s.includes("organizer_id") && s.includes("status")) {
      return { rows: [purchaseRow({ organizer_id: 1, status: "collecting" })] };
    }
    if (s.includes("INSERT INTO purchase_discussion_messages")) {
      return {
        rows: [
          {
            id: 1,
            purchase_id: 1,
            user_id: 1,
            body: "Привет",
            created_at: new Date(),
          },
        ],
      };
    }
    if (s.includes("purchase_reviews")) {
      return { rows: [{ avg_rating: 4.5, total: 1 }] };
    }
    if (s.includes("purchase_discussion_messages")) {
      return { rows: [] };
    }
    if (s.includes("INSERT INTO")) {
      return {
        rows: [
          {
            id: 1,
            ...purchaseRow(),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      };
    }
    if (s.includes("SELECT name FROM users")) {
      return { rows: [{ name: "User" }] };
    }
    if (s.includes("SELECT is_admin FROM users")) {
      return { rows: [{ is_admin: false }] };
    }
    if (s.includes("SELECT id FROM users WHERE is_admin")) {
      return { rows: [{ id: 2 }] };
    }
    if (s.includes("SELECT 1 FROM purchase_participants")) {
      return { rows: [{ "?column?": 1 }] };
    }
    if (s.includes("COUNT(DISTINCT user_id)")) {
      return { rows: [{ c: 2 }] };
    }
    if (s.includes("SELECT * FROM purchases WHERE id = $1")) {
      return { rows: [purchaseRow({ organizer_id: 10 })] };
    }
    if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
      return { rows: [purchaseRow({ my_quantity: 1 })] };
    }
    return { rows: [], rowCount: 0 };
  });
}

describe("purchases API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installDefaultPool();
  });

  test("GET /catalog", async () => {
    const res = await request(createApp())
      .get("/api/purchases/catalog")
      .query({ sort: "newest", deal: "closed", categories: "food", max_price: 1000 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
  });

  test("GET / — фильтр статуса", async () => {
    const bad = await request(createApp()).get("/api/purchases").query({ status: "bad" });
    expect(bad.status).toBe(400);
    const ok = await request(createApp()).get("/api/purchases").query({ status: "collecting" });
    expect(ok.status).toBe(200);
  });

  test("GET /mine", async () => {
    const res = await request(createApp()).get("/api/purchases/mine").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("organized");
  });

  test("GET /checkout-requisites", async () => {
    const bad = await request(createApp()).get("/api/purchases/checkout-requisites");
    expect(bad.status).toBe(400);
    const ok = await request(createApp()).get("/api/purchases/checkout-requisites").query({ ids: "1,2" });
    expect(ok.status).toBe(200);
  });

  test("GET /:id", async () => {
    const bad = await request(createApp()).get("/api/purchases/abc");
    expect(bad.status).toBe(400);
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("WHERE p.id = $1") && String(sql).includes("organizer_name")) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 0 };
    });
    const missing = await request(createApp()).get("/api/purchases/1");
    expect(missing.status).toBe(404);
  });

  test("POST / и /submit", async () => {
    const bad = await request(createApp()).post("/api/purchases").set(authHeader()).send({});
    expect(bad.status).toBe(400);
    const ok = await request(createApp()).post("/api/purchases").set(authHeader()).send(validBody);
    expect(ok.status).toBe(201);
    const sub = await request(createApp()).post("/api/purchases/submit").set(authHeader()).send(validBody);
    expect(sub.status).toBe(201);
  });

  test("PATCH /:id/status", async () => {
    const badId = await request(createApp())
      .patch("/api/purchases/x/status")
      .set(authHeader({ id: 10 }))
      .send({ status: "closed" });
    expect(badId.status).toBe(400);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql) === "SELECT * FROM purchases WHERE id = $1") {
        return { rows: [purchaseRow({ organizer_id: 10, status: "collecting" })] };
      }
      if (String(sql).includes("UPDATE purchases SET status")) {
        return { rowCount: 1 };
      }
      if (String(sql).includes("participant_status = 'processing'")) {
        return { rowCount: 1 };
      }
      if (String(sql).includes("FROM purchases p INNER JOIN users")) {
        return { rows: [purchaseRow({ status: "closed", organizer_id: 10 })] };
      }
      if (String(sql).includes("SELECT title FROM purchases")) {
        return { rows: [{ title: "T" }] };
      }
      return { rows: [], rowCount: 0 };
    });

    const ok = await request(createApp())
      .patch("/api/purchases/1/status")
      .set(authHeader({ id: 10 }))
      .send({ status: "closed" });
    expect(ok.status).toBe(200);
  });

  test("POST /:id/join и DELETE", async () => {
    pool.query.mockImplementation(async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return {
          rows: [
            purchaseRow({
              id: params[0],
              organizer_id: 99,
              status: "collecting",
              min_participants: 2,
            }),
          ],
        };
      }
      if (s.includes("SELECT 1 FROM purchase_participants WHERE purchase_id")) {
        return { rows: [] };
      }
      if (s.includes("INSERT INTO purchase_participants")) {
        return { rowCount: 1 };
      }
      if (s.includes("COUNT(DISTINCT user_id)")) {
        return { rows: [{ c: 2 }] };
      }
      if (s.includes("UPDATE purchases SET status = 'closed'")) {
        return { rowCount: 1 };
      }
      if (s.includes("INNER JOIN purchase_participants px")) {
        return { rows: [purchaseRow({ my_quantity: 1, organizer_id: 99 })] };
      }
      if (s.includes("SELECT name FROM users")) {
        return { rows: [{ name: "Joiner" }] };
      }
      return { rows: [], rowCount: 0 };
    });

    const join = await request(createApp())
      .post("/api/purchases/1/join")
      .set(authHeader({ id: 5 }))
      .send({ delivery_method: "pickup", payment_method: "card" });
    expect(join.status).toBe(200);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql) === "SELECT * FROM purchases WHERE id = $1") {
        return { rows: [purchaseRow({ status: "collecting" })] };
      }
      if (String(sql).includes("DELETE FROM purchase_participants")) {
        return { rows: [{ id: 1 }] };
      }
      if (String(sql).includes("COUNT(DISTINCT user_id)")) {
        return { rows: [{ c: 0 }] };
      }
      if (String(sql).includes("UPDATE purchases SET status = 'collecting'")) {
        return { rowCount: 1 };
      }
      if (String(sql).includes("SELECT name FROM users")) {
        return { rows: [{ name: "Leaver" }] };
      }
      return { rows: [], rowCount: 0 };
    });

    const leave = await request(createApp()).delete("/api/purchases/1/join").set(authHeader({ id: 5 }));
    expect(leave.status).toBe(200);
  });

  test("reviews и discussion", async () => {
    const reviews = await request(createApp()).get("/api/purchases/1/reviews");
    expect(reviews.status).toBe(200);

    const postReview = await request(createApp())
      .post("/api/purchases/1/reviews")
      .set(authHeader())
      .send({ rating: 5, comment: "ok" });
    expect(postReview.status).toBe(201);

    const discussion = await request(createApp()).get("/api/purchases/1/discussion");
    expect(discussion.status).toBe(200);

    const postMsg = await request(createApp())
      .post("/api/purchases/1/discussion")
      .set(authHeader())
      .send({ body: "Привет" });
    expect(postMsg.status).toBe(201);
  });
});
