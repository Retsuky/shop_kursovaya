import type { Purchase } from "./purchasesMeta";

export function formatTimeLeft(deadlineIso: string): string {
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (ms <= 0) {
    return "Срок истёк";
  }
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) {
    return `осталось ${d}д ${h}ч`;
  }
  if (h > 0) {
    return `осталось ${h}ч ${m}м`;
  }
  return `осталось ${m}м`;
}

export function formatRub(value: string | number): string {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
}

export function catalogProgress(purchase: Purchase): { percent: number; participantsLabel: string } {
  const c = purchase.participant_count ?? 0;
  const m = Math.max(1, purchase.min_participants ?? 1);
  const percent = Math.min(100, Math.round((c / m) * 100));
  return {
    percent,
    participantsLabel: `${c}/${m} участников`,
  };
}

export function discountPercent(purchase: Purchase): number | null {
  const unit = Number(String(purchase.unit_price).replace(",", "."));
  const retailRaw = purchase.retail_price;
  if (retailRaw == null || retailRaw === "") {
    return null;
  }
  const retail = Number(String(retailRaw).replace(",", "."));
  if (!Number.isFinite(unit) || !Number.isFinite(retail) || retail <= unit) {
    return null;
  }
  return Math.round((1 - unit / retail) * 100);
}

export function isAlmostFull(purchase: Purchase): boolean {
  if (purchase.status !== "collecting") {
    return false;
  }
  const { percent } = catalogProgress(purchase);
  return percent >= 90;
}
