const express = require("express");
const pool = require("../config/db");
const requireAuth = require("../middleware/requireAuth");
const optionalAuth = require("../middleware/optionalAuth");
const {
  createNotification,
  notifyStatusChange,
  notifyGroupDiscountReached,
} = require("../services/notifications");

const router = express.Router();
const {
  PARTICIPANT_PREVIEW_SQL,
  normalizeParticipantPreview,
} = require("../lib/participantPreview");
const { promoteAssemblyToProcessingAfterClose } = require("../lib/participantOrderFlow");

const PURCHASE_STATUSES = new Set(["collecting", "closed", "completed", "cancelled"]);
const PARTICIPANT_STATUSES = new Set(["processing","assembly", "delivery", "handed"]);
const DELIVERY_METHODS = new Set(["pickup", "courier"]);
const PAYMENT_METHODS = new Set(["card", "sbp"]);

function normalizeParticipantStatus(raw) {
  const s = String(raw ?? "").trim();
  if (s === "collecting") return "assembly";
  if (s === "completed") return "handed";
  return s;
}

function mapPurchase(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizer_id: row.organizer_id,
    title: row.title,
    description: row.description ?? "",
    product_name: row.product_name,
    unit_price: row.unit_price != null ? String(row.unit_price) : "0",
    min_participants: row.min_participants,
    deadline: row.deadline,
    city: row.city ?? "",
    pickup_address: row.pickup_address ?? "",
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    organizer_name: row.organizer_name,
    participant_count: row.participant_count != null ? Number(row.participant_count) : undefined,
    total_quantity:
      row.total_quantity != null ? Number(row.total_quantity) : undefined,
    category: row.category != null ? String(row.category) : "",
    image_url: row.image_url != null ? String(row.image_url) : "",
    retail_price: row.retail_price != null ? String(row.retail_price) : null,
    participant_preview: normalizeParticipantPreview(row.participant_preview),
    my_quantity:
      row.my_quantity != null && row.my_quantity !== ""
        ? Number(row.my_quantity)
        : undefined,
    my_participant_status:
      row.my_participant_status != null && String(row.my_participant_status).trim() !== ""
        ? normalizeParticipantStatus(row.my_participant_status)
        : undefined,
    rating_avg:
      row.rating_avg != null && row.rating_avg !== ""
        ? Number(row.rating_avg)
        : undefined,
    rating_count:
      row.rating_count != null && row.rating_count !== ""
        ? Number(row.rating_count)
        : undefined,
  };
}
router.get("/catalog", optionalAuth, async (req, res) => {
  const limit = Math.min(48, Math.max(1, parseInt(String(req.query.limit), 10) || 12));
  const offset = Math.max(0, parseInt(String(req.query.offset), 10) || 0);
  const maxPriceRaw = req.query.max_price;
  const maxPrice =
    maxPriceRaw != null && String(maxPriceRaw).trim() !== "" ? Number(maxPriceRaw) : null;
  const sortRaw = typeof req.query.sort === "string" ? req.query.sort : "popular";
  const sort = ["popular", "newest", "closing"].includes(sortRaw) ? sortRaw : "popular";
  const dealRaw = typeof req.query.deal === "string" ? req.query.deal : "open";
  const deal = ["open", "closed", "closed_group", "all"].includes(dealRaw) ? dealRaw : "open";

  const categories =
    typeof req.query.categories === "string" && req.query.categories.trim()
      ? req.query.categories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const params = [];
  const where = ["p.status <> 'cancelled'"];

  if (Number.isFinite(maxPrice)) {
    params.push(maxPrice);
    where.push(`p.unit_price <= $${params.length}`);
  }

  if (categories.length) {
    params.push(categories);
    where.push(`p.category = ANY($${params.length}::varchar[])`);
  }

  if (deal === "closed") {
    where.push(`p.status IN ('completed')`);
  } else if (deal === "closed_group") {
    where.push(`p.status IN ('closed')`);
  } else if (deal === "all") {
    /* только статус <> cancelled уже есть */
  } else {
    where.push(`p.status = 'collecting'`);
    where.push(`p.deadline > NOW()`);
  }

  const whereSql = where.join(" AND ");

  let orderBySql = "participant_count DESC NULLS LAST, p.created_at DESC";
  if (sort === "newest") {
    orderBySql = "p.created_at DESC";
  } else if (sort === "closing") {
    orderBySql = "p.deadline ASC";
  }

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS c FROM purchases p WHERE ${whereSql}`,
      params
    );

    const total = countResult.rows[0]?.c ?? 0;

    const viewerId = req.user?.id ?? -1;
    const dataParams = [...params, viewerId, limit, offset];
    const viewerIdx = params.length + 1;
    const limIdx = params.length + 2;
    const offIdx = params.length + 3;

    const dataResult = await pool.query(
      `
        SELECT
          p.*,
          u.name AS organizer_name,
          (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
          (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity,
          (SELECT COALESCE(ROUND(AVG(pr.rating)::numeric, 1), 0)::numeric FROM purchase_reviews pr WHERE pr.purchase_id = p.id) AS rating_avg,
          (SELECT COUNT(*)::int FROM purchase_reviews pr WHERE pr.purchase_id = p.id) AS rating_count,
          ${PARTICIPANT_PREVIEW_SQL} AS participant_preview,
          (
            SELECT ppv.quantity::int
            FROM purchase_participants ppv
            WHERE ppv.purchase_id = p.id AND ppv.user_id = $${viewerIdx}
            LIMIT 1
          ) AS my_quantity
        FROM purchases p
        INNER JOIN users u ON u.id = p.organizer_id
        WHERE ${whereSql}
        ORDER BY ${orderBySql}
        LIMIT $${limIdx} OFFSET $${offIdx}
      `,
      dataParams
    );

    const items = dataResult.rows.map(mapPurchase);

    return res.status(200).json({ items, total, limit, offset });
  } catch (error) {
    console.error("Catalog:", error);
    return res.status(500).json({ message: "Не удалось загрузить каталог." });
  }
});

router.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : null;

  try {
    const params = [];
    let where = "WHERE 1=1";

    if (status) {
      params.push(status);
      where += ` AND p.status = $${params.length}`;
    }

    const result = await pool.query(
      `
        SELECT
          p.*,
          u.name AS organizer_name,
          (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
          (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity,
          (SELECT COALESCE(ROUND(AVG(pr.rating)::numeric, 1), 0)::numeric FROM purchase_reviews pr WHERE pr.purchase_id = p.id) AS rating_avg,
          (SELECT COUNT(*)::int FROM purchase_reviews pr WHERE pr.purchase_id = p.id) AS rating_count,
          ${PARTICIPANT_PREVIEW_SQL} AS participant_preview
        FROM purchases p
        INNER JOIN users u ON u.id = p.organizer_id
        ${where}
        ORDER BY p.created_at DESC
      `,
      params
    );

    return res.status(200).json(result.rows.map(mapPurchase));
  } catch (error) {
    console.error("List purchases:", error);
    return res.status(500).json({ message: "Не удалось загрузить список закупок." });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const organized = await pool.query(
      `
        SELECT
          p.*,
          u.name AS organizer_name,
          (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
          (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity,
          ${PARTICIPANT_PREVIEW_SQL} AS participant_preview
        FROM purchases p
        INNER JOIN users u ON u.id = p.organizer_id
        WHERE p.organizer_id = $1
        ORDER BY p.created_at DESC
      `,
      [userId]
    );

    const joined = await pool.query(
      `
        SELECT
          p.*,
          u.name AS organizer_name,
          pp.quantity AS my_quantity,
          pp.participant_status AS my_participant_status,
          (SELECT COUNT(DISTINCT px.user_id)::int FROM purchase_participants px WHERE px.purchase_id = p.id) AS participant_count,
          (SELECT COALESCE(SUM(px.quantity), 0)::int FROM purchase_participants px WHERE px.purchase_id = p.id) AS total_quantity,
          ${PARTICIPANT_PREVIEW_SQL} AS participant_preview
        FROM purchase_participants pp
        INNER JOIN purchases p ON p.id = pp.purchase_id
        INNER JOIN users u ON u.id = p.organizer_id
        WHERE pp.user_id = $1 AND p.organizer_id <> $1
        ORDER BY p.created_at DESC
      `,
      [userId]
    );

    return res.status(200).json({
      organized: organized.rows.map(mapPurchase),
      joined: joined.rows.map((row) => ({
        ...mapPurchase(row),
        my_quantity: row.my_quantity != null ? Number(row.my_quantity) : undefined,
        my_participant_status:
          row.my_participant_status != null ? normalizeParticipantStatus(row.my_participant_status) : undefined,
      })),
    });
  } catch (error) {
    console.error("Mine purchases:", error);
    return res.status(500).json({ message: "Не удалось загрузить ваши закупки." });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Некорректный идентификатор закупки." });
  }

  try {
    const purchaseResult = await pool.query(
      `
        SELECT
          p.*,
          u.name AS organizer_name,
          (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
          (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity,
          (SELECT COALESCE(ROUND(AVG(pr.rating)::numeric, 1), 0)::numeric FROM purchase_reviews pr WHERE pr.purchase_id = p.id) AS rating_avg,
          (SELECT COUNT(*)::int FROM purchase_reviews pr WHERE pr.purchase_id = p.id) AS rating_count,
          ${PARTICIPANT_PREVIEW_SQL} AS participant_preview
        FROM purchases p
        INNER JOIN users u ON u.id = p.organizer_id
        WHERE p.id = $1
      `,
      [id]
    );

    const row = purchaseResult.rows[0];

    if (!row) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    const participantsResult = await pool.query(
      `
        SELECT
          pp.user_id,
          pp.quantity,
          pp.participant_status,
          pp.delivery_method,
          pp.payment_method,
          pp.delivery_address,
          pp.delivery_comment,
          usr.name AS user_name,
          usr.email,
          COALESCE(NULLIF(trim(usr.avatar_url), ''), '') AS avatar_url,
          pp.created_at AS joined_at,
          pp.updated_at
        FROM purchase_participants pp
        INNER JOIN users usr ON usr.id = pp.user_id
        WHERE pp.purchase_id = $1
        ORDER BY pp.created_at ASC
      `,
      [id]
    );

    return res.status(200).json({
      purchase: mapPurchase(row),
      participants: participantsResult.rows.map((p) => ({
        user_id: p.user_id,
        quantity: p.quantity,
        participant_status:
          p.participant_status != null
            ? normalizeParticipantStatus(p.participant_status)
            : "assembly",
        delivery_method: p.delivery_method != null ? String(p.delivery_method) : "pickup",
        payment_method: p.payment_method != null ? String(p.payment_method) : "card",
        delivery_address: p.delivery_address != null ? String(p.delivery_address) : "",
        delivery_comment: p.delivery_comment != null ? String(p.delivery_comment) : "",
        user_name: p.user_name,
        email: p.email != null ? String(p.email) : "",
        avatar_url: p.avatar_url != null ? String(p.avatar_url).trim() : "",
        joined_at:
          p.joined_at != null ? (typeof p.joined_at === "string" ? p.joined_at : p.joined_at.toISOString()) : "",
        updated_at:
          p.updated_at != null ? (typeof p.updated_at === "string" ? p.updated_at : p.updated_at.toISOString()) : "",
      })),
    });
  } catch (error) {
    console.error("Get purchase:", error);
    return res.status(500).json({ message: "Не удалось загрузить закупку." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const {
    title,
    description,
    product_name,
    unit_price,
    min_participants,
    deadline,
    city,
    pickup_address,
    category,
    image_url,
    retail_price,
  } = req.body;

  if (
    !title ||
    !product_name ||
    unit_price == null ||
    min_participants == null ||
    !deadline
  ) {
    return res.status(400).json({
      message: "Обязательны поля: title, product_name, unit_price, min_participants, deadline.",
    });
  }

  const priceNum = Number(unit_price);

  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ message: "Некорректная цена за единицу." });
  }

  const minP = Number(min_participants);

  if (!Number.isInteger(minP) || minP < 1) {
    return res.status(400).json({ message: "Минимум участников должен быть целым числом ≥ 1." });
  }

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return res.status(400).json({ message: "Некорректная дата сбора." });
  }

  let retailNum = null;
  if (retail_price != null && String(retail_price).trim() !== "") {
    retailNum = Number(retail_price);
    if (!Number.isFinite(retailNum) || retailNum < 0) {
      return res.status(400).json({ message: "Некорректная розничная цена." });
    }
  }

  const categoryStr = category != null ? String(category).trim() : "";
  const imageStr = image_url != null ? String(image_url).trim() : "";

  try {
    const result = await pool.query(
      `
        INSERT INTO purchases (
          organizer_id, title, description, product_name, unit_price,
          min_participants, deadline, city, pickup_address, status,
          category, image_url, retail_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'collecting', $10, $11, $12)
        RETURNING *
      `,
      [
        req.user.id,
        String(title).trim(),
        description != null ? String(description).trim() : "",
        String(product_name).trim(),
        priceNum,
        minP,
        deadlineDate,
        city != null ? String(city).trim() : "",
        pickup_address != null ? String(pickup_address).trim() : "",
        categoryStr,
        imageStr,
        retailNum,
      ]
    );

    const created = result.rows[0];
    const u = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);

    return res.status(201).json(
      mapPurchase({
        ...created,
        organizer_name: u.rows[0]?.name,
        participant_count: 0,
        total_quantity: 0,
      })
    );
  } catch (error) {
    console.error("Create purchase:", error);
    return res.status(500).json({ message: "Не удалось создать закупку." });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { status: nextStatus } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Некорректный идентификатор закупки." });
  }

  if (!nextStatus || typeof nextStatus !== "string") {
    return res.status(400).json({ message: "Укажите поле status." });
  }
  if (!PURCHASE_STATUSES.has(nextStatus)) {
    return res.status(400).json({ message: "Допустимы статусы: collecting, closed, completed, cancelled." });
  }

  try {
    const currentResult = await pool.query("SELECT * FROM purchases WHERE id = $1", [id]);
    const current = currentResult.rows[0];

    if (!current) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    if (current.organizer_id !== req.user.id) {
      return res.status(403).json({ message: "Только организатор может менять статус." });
    }

    if (nextStatus === "cancelled") {
      const prev = current.status;
      await pool.query("UPDATE purchases SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
        "cancelled",
        id,
      ]);
      try {
        await notifyStatusChange(pool, id, prev, "cancelled", [req.user.id]);
      } catch (notifyErr) {
        console.error("Notify cancelled:", notifyErr);
      }
      const updated = await pool.query(
        `
          SELECT p.*, u.name AS organizer_name,
          (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
          (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity
          FROM purchases p INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1
        `,
        [id]
      );

      return res.status(200).json(mapPurchase(updated.rows[0]));
    }

    if (current.status === "cancelled") {
      return res.status(400).json({ message: "Закупка уже завершена или отменена." });
    }
    if (current.status === "completed" && nextStatus === "completed") {
      return res.status(200).json(mapPurchase(current));
    }
    if (current.status === "completed" && (nextStatus === "collecting" || nextStatus === "closed")) {
      return res.status(400).json({ message: "Нельзя вернуть завершённую закупку на этап набора." });
    }

    const transitionAllowed =
      (current.status === "collecting" && (nextStatus === "closed" || nextStatus === "completed")) ||
      (current.status === "closed" && (nextStatus === "collecting" || nextStatus === "completed")) ||
      current.status === nextStatus;
    if (!transitionAllowed) {
      return res.status(400).json({ message: "Недопустимый переход статуса." });
    }

    const prev = current.status;
    await pool.query("UPDATE purchases SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
      nextStatus,
      id,
    ]);
    if (prev === "collecting" && nextStatus === "closed") {
      try {
        await promoteAssemblyToProcessingAfterClose(pool, id);
      } catch (promoteErr) {
        console.error("Promote participants after close:", promoteErr);
      }
    }
    try {
      await notifyStatusChange(pool, id, prev, nextStatus, [req.user.id]);
    } catch (notifyErr) {
      console.error("Notify status:", notifyErr);
    }

    const updated = await pool.query(
      `
        SELECT p.*, u.name AS organizer_name,
        (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
        (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity
        FROM purchases p INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1
      `,
      [id]
    );

    return res.status(200).json(mapPurchase(updated.rows[0]));
  } catch (error) {
    console.error("Patch status:", error);
    return res.status(500).json({ message: "Не удалось обновить статус." });
  }
});

router.post("/:id/join", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const qty = 1;
  const rawParticipantStatus =
    req.body?.participant_status != null ? String(req.body.participant_status).trim() : "assembly";
  const rawDeliveryMethod =
    req.body?.delivery_method != null ? String(req.body.delivery_method).trim() : "pickup";
  const rawPaymentMethod =
    req.body?.payment_method != null ? String(req.body.payment_method).trim() : "card";
  const deliveryAddress =
    req.body?.delivery_address != null ? String(req.body.delivery_address).trim() : "";
  const deliveryComment =
    req.body?.delivery_comment != null ? String(req.body.delivery_comment).trim() : "";

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Некорректный идентификатор закупки." });
  }

  const participantStatus = normalizeParticipantStatus(rawParticipantStatus);
  if (!PARTICIPANT_STATUSES.has(participantStatus)) {
    return res.status(400).json({ message: "Некорректный participant_status." });
  }
  if (!DELIVERY_METHODS.has(rawDeliveryMethod)) {
    return res.status(400).json({ message: "Некорректный способ получения." });
  }
  if (!PAYMENT_METHODS.has(rawPaymentMethod)) {
    return res.status(400).json({ message: "Некорректный способ оплаты." });
  }
  if (rawDeliveryMethod === "courier" && !deliveryAddress) {
    return res.status(400).json({ message: "Для курьерской доставки нужен адрес." });
  }
  if (deliveryAddress.length > 1000) {
    return res.status(400).json({ message: "Адрес не должен превышать 1000 символов." });
  }
  if (deliveryComment.length > 1000) {
    return res.status(400).json({ message: "Комментарий не должен превышать 1000 символов." });
  }

  try {
    const pResult = await pool.query(
      `
        SELECT p.*,
        (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity
        FROM purchases p WHERE p.id = $1
      `,
      [id]
    );

    const purchase = pResult.rows[0];

    if (!purchase) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    if (purchase.status !== "collecting") {
      return res.status(400).json({ message: "Присоединиться можно только на этапе сбора заявок." });
    }

    if (purchase.organizer_id === req.user.id) {
      return res.status(400).json({ message: "Организатор не может добавлять заявку к своей же закупке." });
    }

    const dl = new Date(purchase.deadline);

    if (dl.getTime() < Date.now()) {
      return res.status(400).json({ message: "Срок сбора заявок истёк." });
    }

    await pool.query(
      `
        INSERT INTO purchase_participants (
          purchase_id, user_id, quantity, participant_status,
          delivery_method, payment_method, delivery_address, delivery_comment, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (purchase_id, user_id)
        DO UPDATE SET
          quantity = EXCLUDED.quantity,
          participant_status = EXCLUDED.participant_status,
          delivery_method = EXCLUDED.delivery_method,
          payment_method = EXCLUDED.payment_method,
          delivery_address = EXCLUDED.delivery_address,
          delivery_comment = EXCLUDED.delivery_comment,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        id,
        req.user.id,
        qty,
        participantStatus,
        rawDeliveryMethod,
        rawPaymentMethod,
        rawDeliveryMethod === "courier" ? deliveryAddress : "",
        deliveryComment,
      ]
    );

    const crowd = await pool.query(
      `SELECT COUNT(DISTINCT user_id)::int AS c FROM purchase_participants WHERE purchase_id = $1`,
      [id]
    );
    const participantsCount = Number(crowd.rows[0]?.c ?? 0);
    const minParticipants = Math.max(1, Number(purchase.min_participants ?? 1));
    if (participantsCount >= minParticipants && purchase.status === "collecting") {
      await pool.query(`UPDATE purchases SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
      try {
        await promoteAssemblyToProcessingAfterClose(pool, id);
      } catch (promoteErr) {
        console.error("Promote participants after auto-close:", promoteErr);
      }
      try {
        await notifyGroupDiscountReached(pool, id, []);
      } catch (notifyErr) {
        console.error("Notify group discount reached:", notifyErr);
      }
    }

    try {
      const nameRes = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
      const joinerName = nameRes.rows[0]?.name ?? "Участник";
      await createNotification(pool, {
        userId: purchase.organizer_id,
        purchaseId: id,
        type: "join_request",
        title: "Новая заявка в закупке",
        body: `${joinerName} присоединился (×${qty}) к «${purchase.title}».`,
      });
    } catch (notifyErr) {
      console.error("Notify join:", notifyErr);
    }

    const totals = await pool.query(
      `
        SELECT
          p.*,
          u.name AS organizer_name,
          (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
          (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity,
          px.quantity AS my_quantity
        FROM purchases p
        INNER JOIN users u ON u.id = p.organizer_id
        INNER JOIN purchase_participants px ON px.purchase_id = p.id AND px.user_id = $2
        WHERE p.id = $1
      `,
      [id, req.user.id]
    );

    const row = totals.rows[0];

    return res.status(200).json({
      purchase: mapPurchase(row),
      my_quantity: row?.my_quantity != null ? Number(row.my_quantity) : qty,
    });
  } catch (error) {
    console.error("Join purchase:", error);
    return res.status(500).json({ message: "Не удалось присоединиться к закупке." });
  }
});

router.delete("/:id/join", requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Некорректный идентификатор закупки." });
  }

  try {
    const pResult = await pool.query("SELECT * FROM purchases WHERE id = $1", [id]);
    const purchase = pResult.rows[0];

    if (!purchase) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    if (purchase.status !== "collecting" && purchase.status !== "closed") {
      return res.status(400).json({ message: "Отказаться можно только пока идёт сбор заявок или набор закрыт." });
    }

    const deleted = await pool.query(
      "DELETE FROM purchase_participants WHERE purchase_id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (!deleted.rows[0]) {
      return res.status(400).json({ message: "Вы не записаны участником этой закупки." });
    }

    const crowd = await pool.query(
      `SELECT COUNT(DISTINCT user_id)::int AS c FROM purchase_participants WHERE purchase_id = $1`,
      [id]
    );
    const participantsCount = Number(crowd.rows[0]?.c ?? 0);
    const minParticipants = Math.max(1, Number(purchase.min_participants ?? 1));
    if (participantsCount < minParticipants && purchase.status === "closed") {
      await pool.query(`UPDATE purchases SET status = 'collecting', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    }

    try {
      const nameRes = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
      const leaverName = nameRes.rows[0]?.name ?? "Участник";
      await createNotification(pool, {
        userId: purchase.organizer_id,
        purchaseId: id,
        type: "participant_left",
        title: "Участник вышел из закупки",
        body: `${leaverName} отказался от «${purchase.title}».`,
      });
    } catch (notifyErr) {
      console.error("Notify leave:", notifyErr);
    }

    return res.status(200).json({ message: "Вы вышли из закупки." });
  } catch (error) {
    console.error("Leave purchase:", error);
    return res.status(500).json({ message: "Не удалось выйти из закупки." });
  }
});

function mapDiscussionMessage(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    purchase_id: row.purchase_id,
    user_id: row.user_id,
    user_name: row.user_name != null ? String(row.user_name) : "",
    email: row.email != null ? String(row.email) : "",
    avatar_url: row.avatar_url != null ? String(row.avatar_url).trim() : "",
    body: row.body != null ? String(row.body) : "",
    created_at:
      row.created_at != null
        ? typeof row.created_at === "string"
          ? row.created_at
          : row.created_at.toISOString()
        : "",
  };
}

function mapReview(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    purchase_id: row.purchase_id,
    user_id: row.user_id,
    user_name: row.user_name != null ? String(row.user_name) : "",
    email: row.email != null ? String(row.email) : "",
    avatar_url: row.avatar_url != null ? String(row.avatar_url).trim() : "",
    rating: row.rating != null ? Number(row.rating) : 0,
    comment: row.comment != null ? String(row.comment) : "",
    created_at:
      row.created_at != null
        ? typeof row.created_at === "string"
          ? row.created_at
          : row.created_at.toISOString()
        : "",
    updated_at:
      row.updated_at != null
        ? typeof row.updated_at === "string"
          ? row.updated_at
          : row.updated_at.toISOString()
        : "",
  };
}

router.get("/:id/reviews", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Некорректный идентификатор закупки." });
  }
  try {
    const exists = await pool.query("SELECT id FROM purchases WHERE id = $1", [id]);
    if (!exists.rows[0]) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    const summary = await pool.query(
      `
        SELECT
          COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::numeric AS avg_rating,
          COUNT(*)::int AS total
        FROM purchase_reviews
        WHERE purchase_id = $1
      `,
      [id]
    );

    const rows = await pool.query(
      `
        SELECT
          r.id,
          r.purchase_id,
          r.user_id,
          r.rating,
          r.comment,
          r.created_at,
          r.updated_at,
          u.name AS user_name,
          u.email,
          COALESCE(NULLIF(trim(u.avatar_url), ''), '') AS avatar_url
        FROM purchase_reviews r
        INNER JOIN users u ON u.id = r.user_id
        WHERE r.purchase_id = $1
        ORDER BY r.updated_at DESC, r.created_at DESC
        LIMIT 200
      `,
      [id]
    );

    return res.status(200).json({
      summary: {
        avg_rating: Number(summary.rows[0]?.avg_rating ?? 0),
        total: Number(summary.rows[0]?.total ?? 0),
      },
      reviews: rows.rows.map(mapReview),
    });
  } catch (error) {
    console.error("Reviews list:", error);
    return res.status(500).json({ message: "Не удалось загрузить отзывы." });
  }
});

router.post("/:id/reviews", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const rating = Number(req.body?.rating);
  const comment = req.body?.comment != null ? String(req.body.comment).trim() : "";

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Некорректный идентификатор закупки." });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Оценка должна быть целым числом от 1 до 5." });
  }
  if (comment.length > 2000) {
    return res.status(400).json({ message: "Комментарий не длиннее 2000 символов." });
  }

  try {
    const pRes = await pool.query("SELECT id, organizer_id, title, status FROM purchases WHERE id = $1", [id]);
    const purchase = pRes.rows[0];
    if (!purchase) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    const joinedRes = await pool.query(
      "SELECT 1 FROM purchase_participants WHERE purchase_id = $1 AND user_id = $2 LIMIT 1",
      [id, req.user.id]
    );
    const canReview = purchase.organizer_id === req.user.id || Boolean(joinedRes.rows[0]);
    if (!canReview) {
      return res.status(403).json({ message: "Оставить отзыв могут только участники этой закупки." });
    }

    const saved = await pool.query(
      `
        INSERT INTO purchase_reviews (purchase_id, user_id, rating, comment, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (purchase_id, user_id)
        DO UPDATE SET
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, purchase_id, user_id, rating, comment, created_at, updated_at
      `,
      [id, req.user.id, rating, comment]
    );

    const userRes = await pool.query(
      `
        SELECT
          name AS user_name,
          email,
          COALESCE(NULLIF(trim(avatar_url), ''), '') AS avatar_url
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );

    const summary = await pool.query(
      `
        SELECT
          COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::numeric AS avg_rating,
          COUNT(*)::int AS total
        FROM purchase_reviews
        WHERE purchase_id = $1
      `,
      [id]
    );

    const review = mapReview({
      ...saved.rows[0],
      user_name: userRes.rows[0]?.user_name ?? "Участник",
      email: userRes.rows[0]?.email ?? "",
      avatar_url: userRes.rows[0]?.avatar_url ?? "",
    });

    return res.status(201).json({
      review,
      summary: {
        avg_rating: Number(summary.rows[0]?.avg_rating ?? 0),
        total: Number(summary.rows[0]?.total ?? 0),
      },
    });
  } catch (error) {
    console.error("Review upsert:", error);
    return res.status(500).json({ message: "Не удалось сохранить отзыв." });
  }
});

router.get("/:id/discussion", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Некорректный идентификатор закупки." });
  }

  try {
    const exists = await pool.query("SELECT id FROM purchases WHERE id = $1", [id]);
    if (!exists.rows[0]) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    const result = await pool.query(
      `
        SELECT
          m.id,
          m.purchase_id,
          m.user_id,
          m.body,
          m.created_at,
          u.name AS user_name,
          u.email,
          COALESCE(NULLIF(trim(u.avatar_url), ''), '') AS avatar_url
        FROM purchase_discussion_messages m
        INNER JOIN users u ON u.id = m.user_id
        WHERE m.purchase_id = $1
        ORDER BY m.created_at ASC
        LIMIT 200
      `,
      [id]
    );

    return res.status(200).json({ messages: result.rows.map(mapDiscussionMessage) });
  } catch (error) {
    console.error("Discussion list:", error);
    return res.status(500).json({ message: "Не удалось загрузить обсуждение." });
  }
});

router.post("/:id/discussion", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const rawBody = req.body?.body;

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Некорректный идентификатор закупки." });
  }

  const body = rawBody != null ? String(rawBody).trim() : "";
  if (body.length === 0) {
    return res.status(400).json({ message: "Введите текст сообщения." });
  }
  if (body.length > 4000) {
    return res.status(400).json({ message: "Сообщение не длиннее 4000 символов." });
  }

  try {
    const pResult = await pool.query(
      "SELECT id, title, organizer_id, status FROM purchases WHERE id = $1",
      [id]
    );
    const purchase = pResult.rows[0];

    if (!purchase) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    if (purchase.status === "cancelled") {
      return res.status(400).json({ message: "В отменённой закупке нельзя писать сообщения." });
    }

    const ins = await pool.query(
      `
        INSERT INTO purchase_discussion_messages (purchase_id, user_id, body)
        VALUES ($1, $2, $3)
        RETURNING id, purchase_id, user_id, body, created_at
      `,
      [id, req.user.id, body]
    );

    const inserted = ins.rows[0];
    const uRow = await pool.query(
      `
        SELECT name, email, COALESCE(NULLIF(trim(avatar_url), ''), '') AS avatar_url
        FROM users WHERE id = $1
      `,
      [req.user.id]
    );

    const authorName = uRow.rows[0]?.name ?? "Участник";
    const authorEmail = uRow.rows[0]?.email != null ? String(uRow.rows[0].email) : "";

    if (purchase.organizer_id !== req.user.id) {
      try {
        await createNotification(pool, {
          userId: purchase.organizer_id,
          purchaseId: id,
          type: "discussion",
          title: "Новое сообщение в обсуждении",
          body: `${authorName} написал в «${purchase.title}».`,
        });
      } catch (notifyErr) {
        console.error("Notify discussion:", notifyErr);
      }
    }

    const msg = mapDiscussionMessage({
      ...inserted,
      user_name: authorName,
      email: authorEmail,
      avatar_url: uRow.rows[0]?.avatar_url ?? "",
    });

    return res.status(201).json({ message: msg });
  } catch (error) {
    console.error("Discussion post:", error);
    return res.status(500).json({ message: "Не удалось отправить сообщение." });
  }
});

module.exports = router;
