const { purchaseRow, userRow, futureDeadline } = require("./mockPool");

/** Базовый mock pool.query для API-тестов маршрутов. */
function createRoutePool(overrides = {}) {
  const handlers = {
    admin: () => ({ rows: [{ is_admin: true }] }),
    ...overrides,
  };

  const query = jest.fn(async (sql, params = []) => {
    const s = String(sql);
    for (const [key, fn] of Object.entries(handlers)) {
      if (typeof key === "string" && key.length > 3 && s.includes(key)) {
        return fn(s, params);
      }
    }
    if (s.includes("SELECT is_admin FROM users WHERE id")) {
      return handlers.admin(s, params);
    }
    if (s.includes("INSERT INTO notifications")) {
      return { rowCount: 1 };
    }
    if (s.includes("BEGIN") || s.includes("COMMIT") || s.includes("ROLLBACK")) {
      return { rows: [] };
    }
    return { rows: [], rowCount: 0 };
  });

  const connect = jest.fn(async () => ({
    query: jest.fn(async (sql, params) => {
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(sql))) {
        return { rows: [] };
      }
      return query(sql, params);
    }),
    release: jest.fn(),
  }));

  return { query, connect, handlers };
}

function adminPurchaseRow(extra = {}) {
  return purchaseRow({
    organizer_name: "Org",
    participant_count: 2,
    total_quantity: 2,
    participant_preview: [],
    ...extra,
  });
}

module.exports = { createRoutePool, adminPurchaseRow, futureDeadline, purchaseRow, userRow };
