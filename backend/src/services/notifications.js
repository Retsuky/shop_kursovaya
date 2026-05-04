/**
 * Создание уведомлений и рассылка по участникам сделки.
 * @param {import("pg").Pool} pool
 */

const STATUS_RU = {
  collecting: "Сбор заявок",
  payment: "Оплата",
  supplier_order: "Заказ у поставщика",
  delivery: "Доставка и выдача",
  completed: "Завершена",
  cancelled: "Отменена",
};

function statusLabel(status) {
  return STATUS_RU[status] ?? status;
}

/**
 * @param {import("pg").Pool | import("pg").PoolClient} client
 */
async function createNotification(client, { userId, purchaseId = null, type = "deal_update", title, body }) {
  const t = String(title ?? "").trim().slice(0, 220);
  const b = String(body ?? "").trim();
  if (!userId || !t) {
    return;
  }
  await client.query(
    `
      INSERT INTO notifications (user_id, purchase_id, type, title, body)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [userId, purchaseId, String(type ?? "deal_update").slice(0, 48), t, b]
  );
}

/**
 * Уведомить организатора и всех участников сделки.
 * @param {object} opts
 * @param {number[]} [opts.excludeUserIds] — например, кто совершил действие и уже в курсе
 */
async function notifyPurchaseAudience(pool, purchaseId, opts) {
  const { title, body, type = "deal_update", excludeUserIds = [] } = opts;
  const pRes = await pool.query("SELECT id, organizer_id, title FROM purchases WHERE id = $1", [
    purchaseId,
  ]);
  const row = pRes.rows[0];
  if (!row) {
    return;
  }
  const recipientIds = new Set([row.organizer_id]);
  const part = await pool.query(
    `SELECT DISTINCT user_id FROM purchase_participants WHERE purchase_id = $1`,
    [purchaseId]
  );
  for (const r of part.rows) {
    recipientIds.add(r.user_id);
  }
  for (const ex of excludeUserIds) {
    recipientIds.delete(ex);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const uid of recipientIds) {
      await createNotification(client, {
        userId: uid,
        purchaseId,
        type,
        title,
        body,
      });
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function notifyStatusChange(pool, purchaseId, previousStatus, newStatus, excludeUserIds = []) {
  const pRes = await pool.query(`SELECT title FROM purchases WHERE id = $1`, [purchaseId]);
  const titleDeal = pRes.rows[0]?.title ?? "Сделка";
  const title = `Статус: «${titleDeal}»`;
  const body = `Было: «${statusLabel(previousStatus)}». Стало: «${statusLabel(newStatus)}».`;
  await notifyPurchaseAudience(pool, purchaseId, {
    title,
    body,
    type: "status_change",
    excludeUserIds,
  });
}

module.exports = {
  createNotification,
  notifyPurchaseAudience,
  notifyStatusChange,
  statusLabel,
};
