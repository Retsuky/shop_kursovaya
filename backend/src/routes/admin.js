const express = require("express");
const pool = require("../config/db");
const requireAdmin = require("../middleware/requireAdmin");
const {
  PARTICIPANT_PREVIEW_SQL,
  normalizeParticipantPreview,
} = require("../lib/participantPreview");
const {
  notifyStatusChange,
  notifyParticipantDeliveryStatusChange,
} = require("../services/notifications");
const { promoteAssemblyToProcessingAfterClose } = require("../lib/participantOrderFlow");

const router = express.Router();

router.use(requireAdmin);

const PURCHASE_STATUSES = new Set([
  "collecting",
  "closed",
  "completed",
  "cancelled",
]);
const PARTICIPANT_STATUSES = new Set(["assembly", "processing", "delivery", "handed"]);
function normalizeParticipantStatus(raw) {
  const s = String(raw ?? "").trim();
  if (s === "collecting") return "assembly";
  if (s === "completed") return "handed";
  return s;
}

const DELIVERY_METHODS = new Set(["pickup", "courier"]);
const PAYMENT_METHODS = new Set(["card", "sbp"]);

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
    total_quantity: row.total_quantity != null ? Number(row.total_quantity) : undefined,
    category: row.category != null ? String(row.category) : "",
    image_url: row.image_url != null ? String(row.image_url) : "",
    retail_price: row.retail_price != null ? String(row.retail_price) : null,
    participant_preview: normalizeParticipantPreview(row.participant_preview),
  };
}

async function fetchPurchaseById(id) {
  const updated = await pool.query(
    `
      SELECT p.*, u.name AS organizer_name,
      (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
      (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity
      FROM purchases p INNER JOIN users u ON u.id = p.organizer_id WHERE p.id = $1
    `,
    [id]
  );
  return updated.rows[0];
}

router.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at, is_admin,
        NULLIF(trim(COALESCE(avatar_url, '')), '') AS avatar_url
      FROM users ORDER BY id ASC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Admin users:", error);
    return res.status(500).json({ message: "Не удалось загрузить пользователей." });
  }
});

router.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Некорректный идентификатор." });
  }

  if (id === req.user.id) {
    return res.status(400).json({ message: "Нельзя удалить текущего пользователя." });
  }

  try {
    const adminCount = await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE is_admin = TRUE`);
    const target = await pool.query(`SELECT is_admin FROM users WHERE id = $1`, [id]);

    if (!target.rows[0]) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    if (target.rows[0].is_admin && (adminCount.rows[0]?.c ?? 0) <= 1) {
      return res.status(400).json({ message: "Нельзя удалить последнего администратора." });
    }

    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    return res.status(200).json({ message: "Пользователь удалён." });
  } catch (error) {
    console.error("Admin delete user:", error);
    return res.status(500).json({ message: "Не удалось удалить пользователя." });
  }
});

router.get("/purchases", async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          p.*,
          u.name AS organizer_name,
          (SELECT COUNT(DISTINCT pp.user_id)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS participant_count,
          (SELECT COALESCE(SUM(pp.quantity), 0)::int FROM purchase_participants pp WHERE pp.purchase_id = p.id) AS total_quantity,
          ${PARTICIPANT_PREVIEW_SQL} AS participant_preview
        FROM purchases p
        INNER JOIN users u ON u.id = p.organizer_id
        ORDER BY p.created_at DESC
      `
    );

    return res.status(200).json(result.rows.map(mapPurchase));
  } catch (error) {
    console.error("Admin purchases:", error);
    return res.status(500).json({ message: "Не удалось загрузить закупки." });
  }
});

router.get("/purchases/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Некорректный идентификатор." });
  }

  try {
    const row = await fetchPurchaseById(id);

    if (!row) {
      return res.status(404).json({ message: "Позиция не найдена." });
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
          pp.updated_at AS paid_at,
          usr.name AS user_name,
          usr.email AS user_email,
          NULLIF(trim(COALESCE(usr.avatar_url, '')), '') AS avatar_url
        FROM purchase_participants pp
        INNER JOIN users usr ON usr.id = pp.user_id
        WHERE pp.purchase_id = $1
        ORDER BY pp.created_at ASC
      `,
      [id]
    );

    const participants = participantsResult.rows.map((p) => ({
      user_id: p.user_id,
      user_name: p.user_name,
      user_email: p.user_email,
      avatar_url: p.avatar_url,
      quantity: p.quantity != null ? Number(p.quantity) : 0,
      participant_status:
        p.participant_status != null
          ? normalizeParticipantStatus(p.participant_status)
          : "assembly",
      delivery_method: p.delivery_method != null ? String(p.delivery_method) : "pickup",
      payment_method: p.payment_method != null ? String(p.payment_method) : "card",
      delivery_address: p.delivery_address != null ? String(p.delivery_address) : "",
      delivery_comment: p.delivery_comment != null ? String(p.delivery_comment) : "",
      paid_at: p.paid_at != null ? (typeof p.paid_at === "string" ? p.paid_at : p.paid_at.toISOString()) : "",
    }));

    return res.status(200).json({
      purchase: mapPurchase(row),
      organizer: {
        id: row.organizer_id,
        name: row.organizer_name,
      },
      participants,
    });
  } catch (error) {
    console.error("Admin purchase detail:", error);
    return res.status(500).json({ message: "Не удалось загрузить карточку." });
  }
});

router.post("/purchases", async (req, res) => {
  const {
    organizer_id,
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
    status,
  } = req.body;

  if (
    organizer_id == null ||
    !title ||
    !product_name ||
    unit_price == null ||
    min_participants == null ||
    !deadline
  ) {
    return res.status(400).json({
      message:
        "Обязательны поля: organizer_id, title, product_name, unit_price, min_participants, deadline.",
    });
  }

  const orgId = Number(organizer_id);

  if (!Number.isInteger(orgId) || orgId < 1) {
    return res.status(400).json({ message: "Некорректный organizer_id." });
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

  let statusVal = "collecting";

  if (status != null && String(status).trim() !== "") {
    statusVal = String(status).trim();
    if (!PURCHASE_STATUSES.has(statusVal)) {
      return res.status(400).json({ message: "Недопустимый статус." });
    }
  }

  const categoryStr = category != null ? String(category).trim() : "";
  const imageStr = image_url != null ? String(image_url).trim() : "";

  try {
    const uCheck = await pool.query("SELECT id FROM users WHERE id = $1", [orgId]);

    if (!uCheck.rows[0]) {
      return res.status(400).json({ message: "Организатор не найден." });
    }

    const result = await pool.query(
      `
        INSERT INTO purchases (
          organizer_id, title, description, product_name, unit_price,
          min_participants, deadline, city, pickup_address, status,
          category, image_url, retail_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `,
      [
        orgId,
        String(title).trim(),
        description != null ? String(description).trim() : "",
        String(product_name).trim(),
        priceNum,
        minP,
        deadlineDate,
        city != null ? String(city).trim() : "",
        pickup_address != null ? String(pickup_address).trim() : "",
        statusVal,
        categoryStr,
        imageStr,
        retailNum,
      ]
    );

    const newId = result.rows[0].id;
    const row = await fetchPurchaseById(newId);
    return res.status(201).json(mapPurchase(row));
  } catch (error) {
    console.error("Admin create purchase:", error);
    return res.status(500).json({ message: "Не удалось создать закупку." });
  }
});

router.patch("/purchases/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Некорректный идентификатор." });
  }

  const body = req.body;
  const fragments = [];
  const values = [];

  const set = (column, value) => {
    values.push(value);
    fragments.push(`${column} = $${values.length}`);
  };

  if (body.title !== undefined) {
    set("title", String(body.title).trim());
  }
  if (body.description !== undefined) {
    set("description", String(body.description ?? "").trim());
  }
  if (body.product_name !== undefined) {
    set("product_name", String(body.product_name).trim());
  }
  if (body.unit_price !== undefined) {
    const n = Number(body.unit_price);
    if (!Number.isFinite(n) || n < 0) {
      return res.status(400).json({ message: "Некорректная цена за единицу." });
    }
    set("unit_price", n);
  }
  if (body.min_participants !== undefined) {
    const n = Number(body.min_participants);
    if (!Number.isInteger(n) || n < 1) {
      return res.status(400).json({ message: "Некорректный минимум участников." });
    }
    set("min_participants", n);
  }
  if (body.deadline !== undefined) {
    const d = new Date(body.deadline);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: "Некорректная дата сбора." });
    }
    set("deadline", d);
  }
  if (body.city !== undefined) {
    set("city", String(body.city ?? "").trim());
  }
  if (body.pickup_address !== undefined) {
    set("pickup_address", String(body.pickup_address ?? "").trim());
  }
  if (body.category !== undefined) {
    set("category", String(body.category ?? "").trim());
  }
  if (body.image_url !== undefined) {
    set("image_url", String(body.image_url ?? "").trim());
  }
  if (body.retail_price !== undefined) {
    if (body.retail_price === null || String(body.retail_price).trim() === "") {
      set("retail_price", null);
    } else {
      const n = Number(body.retail_price);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: "Некорректная розничная цена." });
      }
      set("retail_price", n);
    }
  }
  if (body.organizer_id !== undefined) {
    const oid = Number(body.organizer_id);
    if (!Number.isInteger(oid) || oid < 1) {
      return res.status(400).json({ message: "Некорректный организатор." });
    }
    const uCheck = await pool.query("SELECT id FROM users WHERE id = $1", [oid]);
    if (!uCheck.rows[0]) {
      return res.status(400).json({ message: "Организатор не найден." });
    }
    set("organizer_id", oid);
  }
  if (body.status !== undefined) {
    const s = String(body.status).trim();
    if (!PURCHASE_STATUSES.has(s)) {
      return res.status(400).json({ message: "Недопустимый статус." });
    }
    set("status", s);
  }

  if (!fragments.length) {
    return res.status(400).json({ message: "Нет полей для обновления." });
  }

  try {
    const exists = await pool.query("SELECT id, status FROM purchases WHERE id = $1", [id]);

    if (!exists.rows[0]) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    const prevStatus = exists.rows[0].status;

    values.push(id);
    const idPlaceholder = values.length;

    await pool.query(
      `UPDATE purchases SET ${fragments.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idPlaceholder}`,
      values
    );

    const row = await fetchPurchaseById(id);
    if (
      body.status !== undefined &&
      row &&
      String(row.status).trim() !== String(prevStatus ?? "").trim()
    ) {
      try {
        await notifyStatusChange(pool, id, prevStatus, row.status, []);
      } catch (notifyErr) {
        console.error("Admin notify status:", notifyErr);
      }
    }
    if (String(prevStatus ?? "").trim() === "collecting" && String(row?.status ?? "").trim() === "closed") {
      try {
        await promoteAssemblyToProcessingAfterClose(pool, id);
      } catch (promoteErr) {
        console.error("Admin promote participants after close:", promoteErr);
      }
    }

    return res.status(200).json(mapPurchase(row));
  } catch (error) {
    console.error("Admin patch purchase:", error);
    return res.status(500).json({ message: "Не удалось обновить закупку." });
  }
});

router.delete("/purchases/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Некорректный идентификатор." });
  }

  try {
    const result = await pool.query("DELETE FROM purchases WHERE id = $1 RETURNING id", [id]);

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Закупка не найдена." });
    }

    return res.status(200).json({ message: "Закупка удалена." });
  } catch (error) {
    console.error("Admin delete purchase:", error);
    return res.status(500).json({ message: "Не удалось удалить закупку." });
  }
});

router.patch("/purchases/:id/participants/:userId", async (req, res) => {
  const id = Number(req.params.id);
  const userId = Number(req.params.userId);
  if (!Number.isInteger(id) || !Number.isInteger(userId)) {
    return res.status(400).json({ message: "Некорректные идентификаторы." });
  }

  const participantStatusRaw =
    req.body?.participant_status != null ? String(req.body.participant_status).trim() : undefined;
  const deliveryMethodRaw =
    req.body?.delivery_method != null ? String(req.body.delivery_method).trim() : undefined;
  const paymentMethodRaw =
    req.body?.payment_method != null ? String(req.body.payment_method).trim() : undefined;
  const deliveryAddressRaw =
    req.body?.delivery_address != null ? String(req.body.delivery_address).trim() : undefined;
  const deliveryCommentRaw =
    req.body?.delivery_comment != null ? String(req.body.delivery_comment).trim() : undefined;

  if (
    participantStatusRaw === undefined &&
    deliveryMethodRaw === undefined &&
    paymentMethodRaw === undefined &&
    deliveryAddressRaw === undefined &&
    deliveryCommentRaw === undefined
  ) {
    return res.status(400).json({ message: "Нет полей для обновления." });
  }

  const participantStatus = participantStatusRaw !== undefined ? normalizeParticipantStatus(participantStatusRaw) : undefined;
  if (participantStatus !== undefined && !PARTICIPANT_STATUSES.has(participantStatus)) {
    return res.status(400).json({ message: "Некорректный статус участника." });
  }
  if (deliveryMethodRaw !== undefined && !DELIVERY_METHODS.has(deliveryMethodRaw)) {
    return res.status(400).json({ message: "Некорректный способ получения." });
  }
  if (paymentMethodRaw !== undefined && !PAYMENT_METHODS.has(paymentMethodRaw)) {
    return res.status(400).json({ message: "Некорректный способ оплаты." });
  }
  if (deliveryAddressRaw !== undefined && deliveryAddressRaw.length > 1000) {
    return res.status(400).json({ message: "Адрес не должен превышать 1000 символов." });
  }
  if (deliveryCommentRaw !== undefined && deliveryCommentRaw.length > 1000) {
    return res.status(400).json({ message: "Комментарий не должен превышать 1000 символов." });
  }

  try {
    const existing = await pool.query(
      `
        SELECT participant_status, delivery_method, delivery_address
        FROM purchase_participants
        WHERE purchase_id = $1 AND user_id = $2
      `,
      [id, userId]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ message: "Участник закупки не найден." });
    }

    const currentDeliveryMethod = String(existing.rows[0].delivery_method ?? "pickup");
    const currentDeliveryAddress = String(existing.rows[0].delivery_address ?? "");
    const nextDeliveryMethod = deliveryMethodRaw ?? currentDeliveryMethod;
    const nextDeliveryAddress = deliveryAddressRaw !== undefined ? deliveryAddressRaw : currentDeliveryAddress;

    if (nextDeliveryMethod === "courier") {
      const hasAddress = nextDeliveryAddress.trim().length > 0;
      if (!hasAddress) {
        return res.status(400).json({ message: "Для курьерской доставки нужен адрес." });
      }
    }

    const updates = [];
    const values = [];
    const addSet = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };
    if (participantStatus !== undefined) addSet("participant_status", participantStatus);
    if (deliveryMethodRaw !== undefined) addSet("delivery_method", deliveryMethodRaw);
    if (paymentMethodRaw !== undefined) addSet("payment_method", paymentMethodRaw);
    if (deliveryAddressRaw !== undefined) addSet("delivery_address", deliveryAddressRaw);
    if (deliveryCommentRaw !== undefined) addSet("delivery_comment", deliveryCommentRaw);
    if (deliveryMethodRaw === "pickup" && deliveryAddressRaw === undefined) {
      addSet("delivery_address", "");
    }
    addSet("updated_at", new Date());

    values.push(id);
    values.push(userId);
    await pool.query(
      `
        UPDATE purchase_participants
        SET ${updates.join(", ")}
        WHERE purchase_id = $${values.length - 1} AND user_id = $${values.length}
      `,
      values
    );

    const previousParticipantStatus = normalizeParticipantStatus(existing.rows[0].participant_status ?? "assembly");
    if (participantStatus !== undefined && participantStatus !== previousParticipantStatus) {
      try {
        await notifyParticipantDeliveryStatusChange(
          pool,
          id,
          userId,
          previousParticipantStatus,
          participantStatus
        );
      } catch (notifyErr) {
        console.error("Admin notify participant delivery status:", notifyErr);
      }
    }

    const progress = await pool.query(
      `
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(CASE WHEN participant_status IN ('handed', 'completed') THEN 1 ELSE 0 END), 0)::int AS handed
        FROM purchase_participants
        WHERE purchase_id = $1
      `,
      [id]
    );
    const totalParticipants = Number(progress.rows[0]?.total ?? 0);
    const handedParticipants = Number(progress.rows[0]?.handed ?? 0);
    if (totalParticipants > 0 && handedParticipants >= totalParticipants) {
      const curStatusRes = await pool.query("SELECT status FROM purchases WHERE id = $1", [id]);
      const prevStatus = String(curStatusRes.rows[0]?.status ?? "");
      if (prevStatus && prevStatus !== "completed") {
        await pool.query(
          "UPDATE purchases SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [id]
        );
        try {
          await notifyStatusChange(pool, id, prevStatus, "completed", []);
        } catch (notifyErr) {
          console.error("Admin notify auto-completed:", notifyErr);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Admin patch participant:", error);
    return res.status(500).json({ message: "Не удалось обновить данные участника." });
  }
});

module.exports = router;
