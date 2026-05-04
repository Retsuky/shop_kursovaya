import type { Purchase } from "../../lib/purchasesMeta";

export const ACTIVE = new Set(["collecting", "payment", "supplier_order", "delivery"]);

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
    if (ACTIVE.has(String(p.status))) {
      ids.add(p.id);
    }
  }
  return ids.size;
}
