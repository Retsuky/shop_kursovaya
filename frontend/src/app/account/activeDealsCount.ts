import type { Purchase } from "../../lib/purchasesMeta";

export const ACTIVE = new Set(["collecting", "closed"]);

function isParticipantActive(p: Purchase & { my_quantity?: number }): boolean {
  const st = String(p.status);
  if (!ACTIVE.has(st)) {
    return false;
  }
  return String(p.my_participant_status ?? "") !== "handed";
}

/** Число сделок пользователя с «живым» статусом (организатор + участник, без двойного счёта по id). */
export function countDistinctActiveDealIds(
  organized: Purchase[],
  joined: (Purchase & { my_quantity?: number })[]
): number {
  const ids = new Set<number>();
  for (const p of organized) {
    if (ACTIVE.has(String(p.status))) {
      ids.add(p.id);
    }
  }
  for (const p of joined) {
    if (isParticipantActive(p)) {
      ids.add(p.id);
    }
  }
  return ids.size;
}
