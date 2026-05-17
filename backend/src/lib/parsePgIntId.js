/** Верхняя граница PostgreSQL INTEGER (int4). */
const MAX_PG_INT = 2147483647;

/**
 * Безопасный разбор id для колонок SERIAL/INTEGER.
 * @param {unknown} raw
 * @returns {number | null}
 */
function parsePgIntId(raw) {
  if (raw === undefined || raw === null) {
    return null;
  }
  const n = Number(typeof raw === "string" ? raw.trim() : raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > MAX_PG_INT) {
    return null;
  }
  return n;
}

/**
 * Список уникальных id из CSV (для query ids=1,2,3).
 * @param {string} raw
 * @param {number} [maxCount]
 * @returns {number[]}
 */
function parsePgIntIdList(raw, maxCount = 48) {
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const part of raw.split(",")) {
    const id = parsePgIntId(part);
    if (id != null && !seen.has(id)) {
      seen.add(id);
      out.push(id);
      if (out.length >= maxCount) {
        break;
      }
    }
  }
  return out;
}

module.exports = { MAX_PG_INT, parsePgIntId, parsePgIntIdList };
