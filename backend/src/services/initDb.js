const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`
  );

  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''`
  );

  await pool.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_details TEXT NOT NULL DEFAULT ''`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT DEFAULT '',
      product_name VARCHAR(200) NOT NULL,
      unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
      min_participants INTEGER NOT NULL DEFAULT 1 CHECK (min_participants >= 1),
      deadline TIMESTAMP NOT NULL,
      city VARCHAR(120) DEFAULT '',
      pickup_address TEXT DEFAULT '',
      status VARCHAR(32) NOT NULL DEFAULT 'collecting',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_participants (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      participant_status VARCHAR(32) NOT NULL DEFAULT 'assembly',
      delivery_method VARCHAR(16) NOT NULL DEFAULT 'pickup',
      payment_method VARCHAR(16) NOT NULL DEFAULT 'card',
      delivery_address TEXT NOT NULL DEFAULT '',
      delivery_comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(purchase_id, user_id)
    )
  `);
  await pool.query(
    `ALTER TABLE purchase_participants ADD COLUMN IF NOT EXISTS participant_status VARCHAR(32) NOT NULL DEFAULT 'assembly'`
  );
  await pool.query(
    `ALTER TABLE purchase_participants ALTER COLUMN participant_status SET DEFAULT 'assembly'`
  );
  await pool.query(
    `ALTER TABLE purchase_participants ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(16) NOT NULL DEFAULT 'pickup'`
  );
  await pool.query(
    `ALTER TABLE purchase_participants ADD COLUMN IF NOT EXISTS payment_method VARCHAR(16) NOT NULL DEFAULT 'card'`
  );
  await pool.query(
    `ALTER TABLE purchase_participants ADD COLUMN IF NOT EXISTS delivery_address TEXT NOT NULL DEFAULT ''`
  );
  await pool.query(
    `ALTER TABLE purchase_participants ADD COLUMN IF NOT EXISTS delivery_comment TEXT NOT NULL DEFAULT ''`
  );
  await pool.query(
    `ALTER TABLE purchase_participants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  );

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchases_organizer ON purchases(organizer_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status)`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_participants_purchase ON purchase_participants(purchase_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_participants_user ON purchase_participants(user_id)`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
      type VARCHAR(48) NOT NULL DEFAULT 'deal_update',
      title VARCHAR(220) NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      read_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_discussion_messages (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CHECK (char_length(trim(body)) > 0)
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_discussion_purchase_created ON purchase_discussion_messages(purchase_id, created_at ASC)`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_reviews (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (purchase_id, user_id),
      CHECK (char_length(trim(comment)) <= 2000)
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_reviews_purchase_created ON purchase_reviews(purchase_id, created_at DESC)`
  );

  await pool.query(
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS category VARCHAR(120) NOT NULL DEFAULT ''`
  );
  await pool.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12, 2)`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchases_category ON purchases(category)`);

  await ensureAdminAccount(pool);
  await seedDemoPurchases(pool);
}

async function ensureAdminAccount(pool) {
  const email = (process.env.ADMIN_EMAIL || "admin@shop.local").trim().toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD;
  if (rawPassword == null || String(rawPassword).trim() === "") {
    throw new Error("ADMIN_PASSWORD не задан. Укажите пароль администратора в переменных окружения.");
  }
  const password = String(rawPassword).trim();
  const name = "Администратор";

  const hash = await bcrypt.hash(password, 10);

  const existing = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);

  if (existing.rows.length === 0) {
    await pool.query(
      `
        INSERT INTO users (name, email, password_hash, is_admin)
        VALUES ($1, $2, $3, TRUE)
      `,
      [name, email, hash]
    );
    console.log(`Создан администратор: ${email}`);
    return;
  }

  await pool.query("UPDATE users SET is_admin = TRUE WHERE id = $1", [existing.rows[0].id]);
}

async function seedDemoPurchases(pool) {
  const {
    rows: [{ n }],
  } = await pool.query("SELECT COUNT(*)::int AS n FROM purchases");

  if (n > 0) {
    return;
  }

  const { rows: users } = await pool.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");

  if (!users.length) {
    return;
  }

  const organizerId = users[0].id;

  const demos = [
    {
      title: "Наушники Audio-X Pro",
      product_name: "Наушники Audio-X Pro",
      description: "Групповая закупка по мотивам каталога CoBuy.",
      unit_price: 189,
      retail_price: 299,
      min_participants: 50,
      category: "Электроника",
      image_url:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA7fs-DXZuipTe_M8Lhq4YNFG4-xUJjbAjd35vmfRIycqyVJq0SK31tWnZmh_qetxqxZKNVa0eiVPc1z1s70lx1iCElbjxWG7I3rLeGZQRSmsg2vLn0_3zcKxx2q90SARTXdgTZHBqpCZCtZrFTFQziz5-ykAfnK7bGscUmyf8HwWILk_QtW4xkyn-rskslKYrPOZxks_8I45tU9L7bxUwBj75laonVZgi4-6GYfiSyk3GFGzJdocqE8Foh2OTfXg8RxUqhcE0Dcj8",
      days: 2,
      hours: 14,
    },
    {
      title: "Кроссовки Velocity Elite",
      product_name: "Кроссовки Velocity Elite",
      description: "",
      unit_price: 120,
      retail_price: 180,
      min_participants: 25,
      category: "Одежда и обувь",
      image_url:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAlYCvV-W5cPE5FBH18ooycdTv3SQnjG05qfyrmjmq1Aw2VPi7L5W96BRhnSmb4LSi_w6b5TziUHXUwEOvdDMiE5Ady5sTpYupio3bvVoLJ5IzQkHc8zU23XAvd8RwiUZz1K8LPZbGCBIrsUEIyfjP0VIfccWSzqBGDACZKNUcXpoNhWEtH2lIWIk0t7QnKzBUkphxMpd5aKxae1aJi3IIShqBHO5PXvAUBOxiH5QLvE6Q-jQHf9UgQ8tv6T5QVIF378rpr877NZzs",
      days: 0,
      hours: 4,
      minutes: 22,
    },
    {
      title: "Очиститель воздуха PureBreeze",
      product_name: "Очиститель воздуха PureBreeze",
      description: "",
      unit_price: 345,
      retail_price: 450,
      min_participants: 100,
      category: "Дом и уют",
      image_url:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD3y4hRjnDdGaPKEm1B_XNFRXIzukyu4IgZJvT6eoBu2dKW6P_muXZcpWPJtc-ZKHFnBTwLXPtj8KXsgkhpNZIRg8J0N4CJGKGS1HroNCM9O8ZpnSoc-riUPrWdvUrL0wSMM1mfrZoiE6EjNi_rNEOtq9HZ6NpOwObcL8wvnmA9DIneJ_z6nozLS7ejE-84LLtVEHVuaphjLOTfr0nKtgECU0zp3HvK8grLZTIgbyaluZjBMg7GgCrVUU2jpHCKR7YyykGRAheLOhE",
      days: 5,
      hours: 12,
    },
    {
      title: "Кроссовки Shadow Run",
      product_name: "Кроссовки Shadow Run",
      description: "",
      unit_price: 85,
      retail_price: null,
      min_participants: 20,
      category: "Мода",
      image_url:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAqSe7vQ6517Mdp6jcDAlvPNHu4YfnJCZ5M39c6o5G6RAcYdIEPQWgLH21g8fEBmnCgZ14Fdg94nCCGk8q8bhVphyX1ApZPO4F2dMXVxwhE8QU8Gzho8mbCfYLJons3PkEtSy73F9ZcldV27MIdgjxzV28ZCWfeA6NRzB1f5ZRQbPPqFjr7NhT-3s7JYl79NZdaPrQgKZKZR_d3OGR27mBJ-6fot_UxuiMRaSRGnurxWmiVtapBianjTZpkLz-X3aKAY0MAVLBpgG8",
      days: 1,
      hours: 0,
    },
    {
      title: "Часы Eon Classic",
      product_name: "Часы Eon Classic",
      description: "",
      unit_price: 159,
      retail_price: null,
      min_participants: 15,
      category: "Аксессуары",
      image_url:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBfQa1xv3hzuhMN2lgyOc16zsbsOByQA6byD1lurxICh0G7ui4pKAYT8sERzbaiNFjxG28q4NEp0GcLZ4r4OqBGitKANKPBA1yb3DqgIhf174Y1GqCXTuQeuIUZ7I4Y8EkjMYTOpW5_BRpWqnk3RMYYYsl1Vz4MeycgOynBbx74y7uqr4NU2s1wCBQgkGSm9o0Jxts6hWg3PRg_4kj6Tj3PNQaJeFSpzzYjnHkyG3kZ093xD69W4-MoqS9zZWXKigAhlNuF9yvU5aU",
      days: 3,
      hours: 0,
    },
    {
      title: "Кофемашина Barista Touch",
      product_name: "Кофемашина Barista Touch",
      description: "",
      unit_price: 720,
      retail_price: null,
      min_participants: 8,
      category: "Дом и кухня",
      image_url:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuACFXh1J3Mfr2jITME5nU2dK6VnmqSAAp4zrAwxCosJWY-nReGiqURMN8Nl98tOEZ_IAPpS_VzwF4BhLmWzYygV824HrsBo3MbwkfAwjGJ9026gIb7h3whsP0kdOo3g48KJkWxH7E5e4dNw9HFHtqZwoyDdCtXcvWIg_fiy1oEy0mcW0i0b8awMRLOmhOi6cxBtgE5Breta1I6XJFusWG-opKRqats_y5QcBFeiBaK_N1clztu12EBLQMay-kR_f9GLVra3QO4KlZc",
      days: 0,
      hours: 12,
    },
  ];

  for (const d of demos) {
    const intervalParts = [];
    if (d.days) {
      intervalParts.push(`${d.days} day${d.days === 1 ? "" : "s"}`);
    }
    if (d.hours) {
      intervalParts.push(`${d.hours} hour${d.hours === 1 ? "" : "s"}`);
    }
    if (d.minutes) {
      intervalParts.push(`${d.minutes} minute${d.minutes === 1 ? "" : "s"}`);
    }
    const intervalSql = intervalParts.length ? intervalParts.join(" + ") : "1 day";

    const retail = d.retail_price != null ? d.retail_price : null;

    await pool.query(
      `
        INSERT INTO purchases (
          organizer_id, title, description, product_name, unit_price,
          min_participants, deadline, city, pickup_address, status,
          category, image_url, retail_price
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          NOW() + ($7::interval),
          '', '', 'collecting',
          $8, $9, $10
        )
      `,
      [
        organizerId,
        d.title,
        d.description,
        d.product_name,
        d.unit_price,
        d.min_participants,
        intervalSql,
        d.category,
        d.image_url,
        retail,
      ]
    );
  }
}

module.exports = initDb;
