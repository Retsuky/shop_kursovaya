function futureDeadline() {
  return new Date(Date.now() + 7 * 86400000).toISOString();
}

function purchaseRow(overrides = {}) {
  return {
    id: 1,
    organizer_id: 10,
    title: "Тестовая закупка",
    description: "Описание",
    product_name: "Товар",
    unit_price: "500",
    min_participants: 2,
    deadline: futureDeadline(),
    city: "Москва",
    pickup_address: "Пункт",
    status: "collecting",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer_name: "Организатор",
    organizer_payment_details: "Реквизиты",
    participant_count: 1,
    total_quantity: 1,
    category: "food",
    image_url: "/uploads/x.jpg",
    retail_price: "700",
    participant_preview: [],
    ...overrides,
  };
}

function userRow(overrides = {}) {
  return {
    id: 1,
    name: "Admin",
    email: "admin@shop.local",
    password_hash: "$2a$10$abcdefghijklmnopqrstuv", // bcrypt mock separately
    created_at: new Date().toISOString(),
    is_admin: true,
    avatar_url: "",
    payment_details: "",
    ...overrides,
  };
}

/**
 * Универсальный mock pool.query — по подстроке SQL.
 * @param {Record<string, (sql: string, params?: unknown[]) => { rows: unknown[], rowCount?: number }>} handlers
 */
function createMockPool(handlers = {}) {
  const defaults = {
    "SELECT is_admin FROM users": () => ({ rows: [{ is_admin: true }] }),
    "SELECT id FROM users WHERE email": () => ({ rows: [] }),
    "SELECT COUNT(*)": () => ({ rows: [{ c: 0 }] }),
    "FROM notifications": () => ({ rows: [] }),
    "INSERT INTO": () => ({ rows: [{ id: 1 }], rowCount: 1 }),
    "UPDATE ": () => ({ rows: [{ id: 1 }], rowCount: 1 }),
    "DELETE FROM": () => ({ rows: [{ id: 1 }], rowCount: 1 }),
    "FROM purchases": () => ({ rows: [purchaseRow()] }),
    "FROM users": () => ({ rows: [userRow()] }),
  };

  const query = jest.fn(async (sql, params) => {
    const s = String(sql);
    for (const [key, fn] of Object.entries({ ...defaults, ...handlers })) {
      if (s.includes(key)) {
        return fn(s, params);
      }
    }
    return { rows: [], rowCount: 0 };
  });

  const connect = jest.fn(async () => {
    const client = {
      query: jest.fn(async (sql, params) => {
        if (String(sql) === "BEGIN" || String(sql) === "COMMIT" || String(sql) === "ROLLBACK") {
          return { rows: [] };
        }
        return query(sql, params);
      }),
      release: jest.fn(),
    };
    return client;
  });

  return { query, connect };
}

module.exports = { createMockPool, purchaseRow, userRow, futureDeadline };
