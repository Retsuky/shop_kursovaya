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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(purchase_id, user_id)
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchases_organizer ON purchases(organizer_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status)`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_participants_purchase ON purchase_participants(purchase_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_participants_user ON purchase_participants(user_id)`
  );
}

module.exports = initDb;
