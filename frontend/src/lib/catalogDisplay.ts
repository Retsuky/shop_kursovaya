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

function parsePriceMoney(v: string | null | undefined): number | null {
  if (v == null || v === "") {
    return null;
  }
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Минимум участников набран — действует групповая цена (или сделка уже не на этапе сбора). */
export function isGroupMinimumMet(purchase: Purchase): boolean {
  const st = purchase.status;
  if (st === "cancelled") {
    return false;
  }
  if (st !== "collecting") {
    return true;
  }
  const c = purchase.participant_count ?? 0;
  const m = Math.max(1, purchase.min_participants ?? 1);
  return c >= m;
}

/**
 * Строковая цена за единицу для сумм и корзины:
 * пока минимум не набран и задана розница — розница, иначе групповая.
 */
export function resolvePurchaseUnitPriceRaw(purchase: Purchase): string {
  if (isGroupMinimumMet(purchase)) {
    return purchase.unit_price;
  }
  const retail = parsePriceMoney(purchase.retail_price);
  if (retail != null && retail > 0) {
    return String(purchase.retail_price).trim();
  }
  return purchase.unit_price;
}

export function resolvePurchaseUnitPriceNumeric(purchase: Purchase): number {
  return parsePriceMoney(resolvePurchaseUnitPriceRaw(purchase)) ?? 0;
}

export type PurchasePricePresentation = {
  mainPrice: string;
  comparePrice?: string;
  discountPercent: number | null;
  caption: string;
};

export function purchasePricePresentation(purchase: Purchase): PurchasePricePresentation {
  const m = Math.max(1, purchase.min_participants ?? 1);
  const unlocked = isGroupMinimumMet(purchase);
  const unitN = parsePriceMoney(purchase.unit_price);
  const retailN = parsePriceMoney(purchase.retail_price);
  const hasRetail = retailN != null && retailN > 0 && unitN != null;

  if (unlocked) {
    let disc: number | null = null;
    if (hasRetail && retailN != null && unitN != null && retailN > unitN) {
      disc = Math.round((1 - unitN / retailN) * 100);
    }
    return {
      mainPrice: formatRub(purchase.unit_price),
      comparePrice:
        hasRetail && retailN != null && unitN != null && retailN > unitN
          ? formatRub(purchase.retail_price!)
          : undefined,
      discountPercent: disc,
      caption:
        purchase.status === "collecting"
          ? `Групповая цена при ${m} участниках — минимум набран`
          : "Групповая цена по условиям закупки",
    };
  }

  if (hasRetail && retailN != null && unitN != null && retailN > unitN) {
    return {
      mainPrice: formatRub(purchase.retail_price!),
      comparePrice: formatRub(purchase.unit_price),
      discountPercent: null,
      caption: `Пока набрано меньше ${m} участников — цена как в магазине. После минимума: ${formatRub(purchase.unit_price)} за шт.`,
    };
  }

  return {
    mainPrice: formatRub(purchase.unit_price),
    comparePrice: undefined,
    discountPercent: null,
    caption: `Групповая цена действует после набора минимум ${m} участников.`,
  };
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
  if (!isGroupMinimumMet(purchase)) {
    return null;
  }
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

function pluralNeedParticipants(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `Нужно ещё ${n} участник`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `Нужно ещё ${n} участника`;
  }
  return `Нужно ещё ${n} участников`;
}

function pluralExtraParticipants(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `+${n} другой`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `+${n} других`;
  }
  return `+${n} других`;
}

/** Данные для карточки «Тренды» на главной (совместимо с TrendingDealCard). */
export function mapPurchaseToTrendingDeal(purchase: Purchase) {
  const min = Math.max(1, purchase.min_participants ?? 1);
  const count = purchase.participant_count ?? 0;
  const collecting = purchase.status === "collecting";
  const goalReached = collecting && count >= min;
  const { percent } = catalogProgress(purchase);
  const almost = isAlmostFull(purchase);
  const disc = discountPercent(purchase);
  const pricePres = purchasePricePresentation(purchase);
  const discountLabel = disc != null ? `Скидка ${disc}%` : undefined;

  const progressLabel = `${percent}% набрано`;
  const progressTone = goalReached || almost ? ("tertiary" as const) : ("primary" as const);
  const pulse = almost && collecting && !goalReached;

  const badge = goalReached
    ? ({ text: "Цель достигнута", variant: "goal" } as const)
    : ({ text: "Группа активна", variant: "active" } as const);

  const avatarCount = Math.min(3, count);
  let footerHint: string | undefined;
  let extraParticipantsLabel: string | undefined;

  if (goalReached) {
    footerHint = "Цель достигнута!";
  } else if (count > 3) {
    extraParticipantsLabel = pluralExtraParticipants(count - 3);
  } else if (count < min) {
    footerHint = pluralNeedParticipants(min - count);
  }

  const cta = goalReached
    ? ({
        label: "Забронировать место",
        href: `/purchases/${purchase.id}`,
        variant: "teal" as const,
      } as const)
    : ({
        label: "Присоединиться к сделке",
        href: `/purchases/${purchase.id}`,
        variant: "coral" as const,
      } as const);

  return {
    title: purchase.title,
    imageUrl: purchase.image_url?.trim() ?? "",
    imageAlt: purchase.title,
    price: pricePres.mainPrice,
    oldPrice: pricePres.comparePrice,
    discountLabel,
    progressLabel,
    progressPercent: percent,
    progressTone,
    pulse,
    footerHint,
    avatarCount,
    extraParticipantsLabel,
    badge,
    cta,
  };
}
