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

const validBody = {
  title: "T",
  product_name: "P",
  unit_price: 10,
  min_participants: 1,
  deadline: futureDeadline(),
};

describe("routes — полное покрытие веток", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  test("admin — demote admin ok, pending_review, participant courier, auto-complete skip", async () => {
    adminOk((s, params) => {
      if (s.includes("SELECT id, is_admin FROM users WHERE id = $1")) {
        return { rows: [{ id: params[0], is_admin: true }] };
      }
      if (s.includes("COUNT(*)::int AS c FROM users WHERE is_admin = TRUE")) {
        return { rows: [{ c: 3 }] };
      }
      if (s.includes("UPDATE users SET is_admin")) return { rowCount: 1 };
      if (s.includes("FROM users WHERE id = $1") && s.includes("avatar_url")) {
        return { rows: [{ id: params[0], is_admin: false }] };
      }
      if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
        return { rows: [{ id: params[0], status: "pending_review" }] };
      }
      if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow({ status: "collecting" })] };
      }
      if (s.includes("COUNT(*)::int AS total")) return { rows: [{ total: 1, handed: 1 }] };
      if (s.includes("participant_status") && s.includes("AND user_id = $2")) {
        return {
          rows: [{ participant_status: "handed", delivery_method: null, delivery_address: null }],
        };
      }
      if (s.includes("UPDATE purchase_participants")) return { rowCount: 1 };
      if (s.includes("SELECT status FROM purchases WHERE id = $1")) {
        return { rows: [{ status: "completed" }] };
      }
      return { rows: [], rowCount: 0 };
    });

    expect(
      (await request(createApp()).patch("/api/admin/users/2").set(authHeader()).send({ is_admin: false })).status
    ).toBe(200);

    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1")
          .set(authHeader())
          .send({ status: "collecting" })
      ).status
    ).toBe(400);

    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ delivery_method: "courier" })
      ).status
    ).toBe(400);

    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ participant_status: "handed", delivery_method: "courier", delivery_address: "Addr" })
      ).status
    ).toBe(200);

    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ participant_status: "handed" })
      ).status
    ).toBe(200);
  });

  test("admin — patch без смены статуса и pickup clears address", async () => {
    adminOk((s, params) => {
      if (s.includes("SELECT id, status FROM purchases WHERE id = $1")) {
        return { rows: [{ id: params[0], status: "collecting" }] };
      }
      if (s.includes("UPDATE purchases SET") && s.includes("updated_at")) return { rowCount: 1 };
      if (s.includes("INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1")) {
        return { rows: [adminPurchaseRow()] };
      }
      if (s.includes("COUNT(*)::int AS total")) return { rows: [{ total: 0, handed: 0 }] };
      if (s.includes("participant_status") && s.includes("AND user_id = $2")) {
        return {
          rows: [{ participant_status: "assembly", delivery_method: "courier", delivery_address: "Old" }],
        };
      }
      if (s.includes("UPDATE purchase_participants")) return { rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    expect(
      (await request(createApp()).patch("/api/admin/purchases/1").set(authHeader()).send({ title: "New" })).status
    ).toBe(200);

    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ delivery_method: "pickup", delivery_comment: "note" })
      ).status
    ).toBe(200);
  });

  test("purchases — catalog filters, parsePurchaseBody, mine, status completed", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("COUNT(*)::int AS c FROM purchases")) return { rows: [{}] };
      if (s.includes("FROM purchases p") && s.includes("rating_avg")) {
        return {
          rows: [
            purchaseRow({
              rating_avg: "4.5",
              rating_count: 2,
              my_participant_status: "completed",
            }),
          ],
        };
      }
      if (s.includes("WHERE p.organizer_id = $1")) {
        return { rows: [purchaseRow()] };
      }
      if (s.includes("FROM purchase_participants pp") && s.includes("pp.user_id = $1")) {
        return {
          rows: [
            purchaseRow({
              my_quantity: null,
              my_participant_status: null,
            }),
            purchaseRow({
              my_quantity: 2,
              my_participant_status: "collecting",
            }),
          ],
        };
      }
      if (s.includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "completed" })] };
      }
      return { rows: [], rowCount: 0 };
    });

    expect(
      (
        await request(createApp()).get("/api/purchases/catalog").query({
          sort: "newest",
          deal: "closed",
          max_price: "1000",
          categories: "food,tech",
          limit: "0",
          offset: "-1",
        })
      ).status
    ).toBe(200);

    expect(
      (
        await request(createApp()).get("/api/purchases/catalog").query({ sort: "closing", deal: "all" })
      ).status
    ).toBe(200);

    pool.query
      .mockResolvedValueOnce({ rows: [{ ...purchaseRow(), id: 9, created_at: new Date(), updated_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [{ name: "Org" }] });
    expect(
      (
        await request(createApp()).post("/api/purchases").set(authHeader()).send({
          ...validBody,
          description: null,
          city: null,
          pickup_address: null,
          category: null,
          image_url: null,
          retail_price: "199",
        })
      ).status
    ).toBe(201);

    expect(
      (
        await request(createApp()).post("/api/purchases").set(authHeader()).send({
          ...validBody,
          retail_price: "bad",
        })
      ).status
    ).toBe(400);

    const mine = await request(createApp()).get("/api/purchases/mine").set(authHeader());
    expect(mine.status).toBe(200);
    expect(mine.body.joined[0].my_quantity).toBeUndefined();
    expect(mine.body.joined[1].my_participant_status).toBe("assembly");

    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "completed" })
      ).status
    ).toBe(200);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "completed" })] };
      }
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "collecting" })
      ).status
    ).toBe(400);
  });

  test("purchases — GET detail participants, checkout, join/leave, reviews/discussion maps", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT id FROM purchases WHERE id = $1") && !s.includes("organizer_id")) {
        return { rows: [{ id: 1 }] };
      }
      if (s.includes("FROM purchases p") && s.includes("INNER JOIN users u ON u.id = p.organizer_id") && s.includes("WHERE p.id = $1")) {
        return { rows: [purchaseRow()] };
      }
      if (s.includes("FROM purchase_participants pp") && s.includes("usr.email")) {
        return {
          rows: [
            {
              user_id: 2,
              quantity: 1,
              participant_status: null,
              delivery_method: null,
              payment_method: null,
              delivery_address: null,
              delivery_comment: null,
              user_name: "U",
              email: null,
              avatar_url: null,
              joined_at: new Date("2024-01-01"),
              updated_at: "2024-02-01T00:00:00.000Z",
            },
          ],
        };
      }
      if (s.includes("WHERE p.id = ANY")) {
        return {
          rows: [
            {
              purchase_id: 1,
              purchase_title: "T1",
              organizer_id: 10,
              organizer_name: "O",
              payment_details: null,
            },
            {
              purchase_id: 2,
              purchase_title: "T2",
              organizer_id: 10,
              organizer_name: "O",
              payment_details: "pay",
            },
          ],
        };
      }
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return {
          rows: [purchaseRow({ organizer_id: 99, status: "collecting", min_participants: 3 })],
        };
      }
      if (s.includes("SELECT 1 FROM purchase_participants")) return { rows: [] };
      if (s.includes("INSERT INTO purchase_participants")) return { rowCount: 1 };
      if (s.includes("COUNT(DISTINCT user_id)")) return { rows: [{}] };
      if (s.includes("INNER JOIN purchase_participants px")) {
        return { rows: [purchaseRow({ organizer_id: 99 })] };
      }
      if (s.includes("SELECT name FROM users")) return { rows: [{}] };
      if (s.includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 99, status: "closed", min_participants: 3, title: "Deal" })] };
      }
      if (s.includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 99, status: "closed", min_participants: 3, title: "Deal" })] };
      }
      if (s.includes("DELETE FROM purchase_participants")) return { rows: [{ id: 1 }] };
      if (s.includes("UPDATE purchases SET status = 'collecting'")) return { rowCount: 1 };
      if (s.includes("INSERT INTO notifications")) return { rowCount: 1 };
      if (s.includes("AVG(rating)") && s.includes("purchase_reviews")) {
        return { rows: [{}] };
      }
      if (s.includes("FROM purchase_reviews r") && s.includes("INNER JOIN users u")) {
        return {
          rows: [
            {
              id: 1,
              purchase_id: 1,
              user_id: 1,
              rating: null,
              comment: null,
              created_at: new Date("2024-03-01"),
              updated_at: new Date("2024-04-01"),
              user_name: null,
              email: null,
              avatar_url: null,
            },
          ],
        };
      }
      if (s.includes("FROM purchase_discussion_messages m")) {
        return {
          rows: [
            {
              id: 1,
              purchase_id: 1,
              user_id: 1,
              body: null,
              created_at: new Date("2024-05-01"),
              user_name: null,
              email: null,
              avatar_url: null,
            },
          ],
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const detail = await request(createApp()).get("/api/purchases/1");
    expect(detail.status).toBe(200);
    expect(detail.body.participants[0].participant_status).toBe("assembly");
    expect(detail.body.participants[0].email).toBe("");

    const checkout = await request(createApp()).get("/api/purchases/checkout-requisites").query({ ids: "1,2" });
    expect(checkout.status).toBe(200);
    expect(checkout.body.organizers).toHaveLength(1);

    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ delivery_method: "pickup" }))
        .status
    ).toBe(200);

    expect((await request(createApp()).delete("/api/purchases/1/join").set(authHeader())).status).toBe(200);

    const reviews = await request(createApp()).get("/api/purchases/1/reviews");
    expect(reviews.status).toBe(200);
    expect(reviews.body.summary.avg_rating).toBe(0);
    expect(reviews.body.reviews[0].comment).toBe("");

    const discussion = await request(createApp()).get("/api/purchases/1/discussion");
    expect(discussion.status).toBe(200);
    expect(discussion.body.messages[0].body).toBe("");

    expect(
      (await request(createApp()).post("/api/purchases/1/discussion").set(authHeader()).send({})).status
    ).toBe(400);
  });

  test("purchases — parsePurchaseBody с полями, catalog sort, closed→collecting", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ ...purchaseRow(), id: 11, created_at: new Date(), updated_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [{ name: "Org" }] });
    expect(
      (
        await request(createApp()).post("/api/purchases").set(authHeader()).send({
          ...validBody,
          description: "Desc",
          city: "City",
          pickup_address: "Addr",
          category: "food",
          image_url: "/img.jpg",
          retail_price: "250",
        })
      ).status
    ).toBe(201);

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("COUNT(*)::int AS c FROM purchases")) return { rows: [{ c: 0 }] };
      if (s.includes("FROM purchases p") && s.includes("rating_avg")) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    expect((await request(createApp()).get("/api/purchases/catalog").query({ sort: ["bad"] })).status).toBe(200);

    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes("SELECT * FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "closed" })] };
      }
      if (String(sql).includes("UPDATE purchases SET status")) return { rowCount: 1 };
      if (String(sql).includes("FROM purchases p INNER JOIN users")) {
        return { rows: [purchaseRow({ organizer_id: 10, status: "collecting" })] };
      }
      if (String(sql).includes("SELECT title FROM purchases")) return { rows: [{ title: "T" }] };
      if (String(sql).includes("SELECT DISTINCT user_id")) return { rows: [] };
      if (String(sql).includes("INSERT INTO notifications")) return { rowCount: 1 };
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
      (
        await request(createApp())
          .patch("/api/purchases/1/status")
          .set(authHeader({ id: 10 }))
          .send({ status: "collecting" })
      ).status
    ).toBe(200);
  });

  test("purchases — participants dates string, join count 0, maps string dates", async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("FROM purchases p") && s.includes("INNER JOIN users u ON u.id = p.organizer_id") && s.includes("WHERE p.id = $1")) {
        return { rows: [purchaseRow()] };
      }
      if (s.includes("FROM purchase_participants pp") && s.includes("usr.email")) {
        return {
          rows: [
            {
              user_id: 2,
              quantity: 1,
              participant_status: "handed",
              delivery_method: "pickup",
              payment_method: "card",
              delivery_address: "",
              delivery_comment: "",
              user_name: "U",
              email: "e@t.ru",
              avatar_url: " /a.jpg ",
              joined_at: "2024-01-01T00:00:00.000Z",
              updated_at: "2024-02-01T00:00:00.000Z",
            },
          ],
        };
      }
      if (s.includes("FROM purchases p WHERE p.id = $1") && s.includes("total_quantity")) {
        return { rows: [purchaseRow({ organizer_id: 99, status: "collecting", min_participants: 1 })] };
      }
      if (s.includes("SELECT 1 FROM purchase_participants")) return { rows: [] };
      if (s.includes("INSERT INTO purchase_participants")) return { rowCount: 1 };
      if (s.includes("COUNT(DISTINCT user_id)")) return { rows: [{ c: 0 }] };
      if (s.includes("INNER JOIN purchase_participants px")) {
        return { rows: [purchaseRow({ organizer_id: 99, my_quantity: 1 })] };
      }
      if (s.includes("SELECT name FROM users")) return { rows: [{ name: "J" }] };
      if (s.includes("INSERT INTO notifications")) return { rowCount: 1 };
      if (s.includes("FROM purchase_discussion_messages m")) {
        return {
          rows: [
            {
              id: 1,
              purchase_id: 1,
              user_id: 1,
              body: "Hi",
              created_at: "2024-06-01T12:00:00.000Z",
              user_name: "A",
              email: "a@t.ru",
              avatar_url: "",
            },
          ],
        };
      }
      if (s.includes("FROM purchase_reviews r")) {
        return {
          rows: [
            {
              id: 1,
              purchase_id: 1,
              user_id: 1,
              rating: 5,
              comment: "c",
              created_at: "2024-07-01T00:00:00.000Z",
              updated_at: "2024-08-01T00:00:00.000Z",
              user_name: "R",
              email: "r@t.ru",
              avatar_url: "",
            },
          ],
        };
      }
      if (s.includes("SELECT id FROM purchases WHERE id = $1")) return { rows: [{ id: 1 }] };
      if (s.includes("AVG(rating)")) return { rows: [{ avg_rating: 5, total: 1 }] };
      return { rows: [], rowCount: 0 };
    });

    const detail = await request(createApp()).get("/api/purchases/1");
    expect(detail.body.participants[0].joined_at).toBe("2024-01-01T00:00:00.000Z");

    expect(
      (await request(createApp()).post("/api/purchases/1/join").set(authHeader()).send({ delivery_method: "pickup" }))
        .status
    ).toBe(200);

    const discussion = await request(createApp()).get("/api/purchases/1/discussion");
    expect(discussion.body.messages[0].created_at).toBe("2024-06-01T12:00:00.000Z");

    const reviews = await request(createApp()).get("/api/purchases/1/reviews");
    expect(reviews.body.reviews[0].created_at).toBe("2024-07-01T00:00:00.000Z");
  });

  test("admin — participant без смены статуса, patch title only", async () => {
    adminOk((s) => {
      if (s.includes("COUNT(*)::int AS total")) return { rows: [{ total: 0, handed: 0 }] };
      if (s.includes("participant_status") && s.includes("AND user_id = $2")) {
        return { rows: [{ participant_status: "handed", delivery_method: "pickup", delivery_address: "a" }] };
      }
      if (s.includes("UPDATE purchase_participants")) return { rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    expect(
      (
        await request(createApp())
          .patch("/api/admin/purchases/1/participants/2")
          .set(authHeader())
          .send({ delivery_comment: "same status" })
      ).status
    ).toBe(200);
  });

  test("purchases — submit notify без имени, POST review summary null", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ ...purchaseRow(), id: 5, created_at: new Date(), updated_at: new Date() }],
      })
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    expect((await request(createApp()).post("/api/purchases/submit").set(authHeader()).send(validBody)).status).toBe(
      201
    );

    pool.query.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1")) {
        return { rows: [purchaseRow({ organizer_id: 99 })] };
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
              rating: 5,
              comment: "ok",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      if (s.includes("FROM users") && s.includes("avatar_url")) {
        return { rows: [{ user_name: "Me", email: "e@t.ru", avatar_url: "" }] };
      }
      if (s.includes("AVG(rating)") && s.includes("purchase_reviews")) {
        return { rows: [{}] };
      }
      return { rows: [], rowCount: 0 };
    });

    const postReview = await request(createApp())
      .post("/api/purchases/1/reviews")
      .set(authHeader())
      .send({ rating: 5, comment: "ok" });
    expect(postReview.status).toBe(201);
    expect(postReview.body.summary.total).toBe(0);
  });
});
