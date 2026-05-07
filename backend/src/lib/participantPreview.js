/** Подзапрос для списка закупок: до 3 последних участников с именем, email и avatar_url (alias таблицы закупок — `p`). */
const PARTICIPANT_PREVIEW_SQL = `
  (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'user_id', s.user_id,
          'user_name', s.user_name,
          'email', s.email,
          'avatar_url', s.avatar_url
        )
        ORDER BY s.created_at ASC
      ),
      '[]'::json
    )
    FROM (
      SELECT *
      FROM (
        SELECT
          pp.user_id,
          u.name AS user_name,
          u.email,
          COALESCE(NULLIF(trim(u.avatar_url), ''), '') AS avatar_url,
          pp.created_at
        FROM purchase_participants pp
        INNER JOIN users u ON u.id = pp.user_id
        WHERE pp.purchase_id = p.id
        ORDER BY pp.created_at DESC
        LIMIT 3
      ) z
      ORDER BY z.created_at ASC
    ) s
  )
`;

function normalizeParticipantPreview(raw) {
  if (!raw) {
    return [];
  }
  let arr = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map((item) => ({
    user_id: Number(item?.user_id),
    user_name: item?.user_name != null ? String(item.user_name) : "",
    email: item?.email != null ? String(item.email) : "",
    avatar_url: item?.avatar_url != null ? String(item.avatar_url).trim() : "",
  }));
}

module.exports = { PARTICIPANT_PREVIEW_SQL, normalizeParticipantPreview };
