import type { Purchase } from "./purchasesMeta";
import { resolvePurchaseUnitPriceRaw } from "./catalogDisplay";
import { resolveUploadUrl } from "./resolveUploadUrl";
import api from "./api";

const STORAGE_KEY = "shop_cart_v1";
const EVENT_NAME = "shop-cart-changed";

export type CartLine = {
  purchaseId: number;
  title: string;
  productName: string;
  unitPrice: string;
  imageUrl: string;
  quantity: number;
  /** Город (если указан в закупке) */
  city?: string;
  /** Адрес / точка выдачи */
  pickupAddress?: string;
  /** ISO-дата окончания сбора заявок */
  deadline?: string;
  /** Снимок закупки: для подписей «групповая цена» в оформлении */
  purchaseStatus?: string;
  minParticipants?: number;
  participantCount?: number;
};

/**
 * Для строки корзины: действует ли групповая цена (минимум набран или закупка уже не в сборе).
 * Без полей-снимка (старые корзины) — считаем, что нет, пока пользователь не обновит состав.
 */
export function isCartLineGroupMinimumMet(line: CartLine): boolean {
  if (line.purchaseStatus === "cancelled") {
    return false;
  }
  if (line.purchaseStatus != null && line.purchaseStatus !== "collecting") {
    return true;
  }
  if (line.minParticipants == null || line.participantCount == null) {
    return false;
  }
  const m = Math.max(1, line.minParticipants);
  return line.participantCount >= m;
}

export function getCart(): CartLine[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (row): row is CartLine =>
          row != null &&
          typeof row === "object" &&
          typeof (row as CartLine).purchaseId === "number" &&
          typeof (row as CartLine).quantity === "number" &&
          (row as CartLine).quantity > 0
      )
      .map((line) => ({ ...line, quantity: 1 }));
  } catch {
    return [];
  }
}

function persist(lines: CartLine[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function setCart(lines: CartLine[]) {
  persist(lines);
}

export function clearCart() {
  persist([]);
}

/** Актуальная строка корзины по закупке (цена с учётом минимума участников и снимок полей). */
export function cartLineFromPurchase(purchase: Purchase, existingLine?: CartLine): CartLine {
  const newImg = resolveUploadUrl(purchase.image_url);
  const imageUrl = newImg || resolveUploadUrl(existingLine?.imageUrl) || "";
  return {
    purchaseId: purchase.id,
    title: purchase.title,
    productName: purchase.product_name,
    unitPrice: resolvePurchaseUnitPriceRaw(purchase),
    imageUrl,
    quantity: 1,
    city: purchase.city?.trim() || undefined,
    pickupAddress: purchase.pickup_address?.trim() || undefined,
    deadline: purchase.deadline?.trim() || undefined,
    purchaseStatus: String(purchase.status),
    minParticipants: purchase.min_participants,
    participantCount: purchase.participant_count,
  };
}

function cartLineEqual(a: CartLine, b: CartLine): boolean {
  return (
    a.purchaseId === b.purchaseId &&
    a.title === b.title &&
    a.productName === b.productName &&
    a.unitPrice === b.unitPrice &&
    a.imageUrl === b.imageUrl &&
    a.quantity === b.quantity &&
    a.city === b.city &&
    a.pickupAddress === b.pickupAddress &&
    a.deadline === b.deadline &&
    a.purchaseStatus === b.purchaseStatus &&
    a.minParticipants === b.minParticipants &&
    a.participantCount === b.participantCount
  );
}

/**
 * Подтягивает с сервера каждую закупку из корзины и обновляет цену/участников
 * (например, после набора минимума — групповая цена вместо розницы).
 */
export async function refreshCartLinesFromServer(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  const cart = getCart();
  if (cart.length === 0) {
    return false;
  }
  const next = [...cart];
  let changed = false;
  for (let i = 0; i < next.length; i++) {
    const before = next[i];
    try {
      const res = await api.get<{ purchase: Purchase }>(`/purchases/${before.purchaseId}`);
      const purchase = res.data?.purchase;
      if (!purchase) {
        continue;
      }
      const merged = cartLineFromPurchase(purchase, before);
      if (!cartLineEqual(before, merged)) {
        next[i] = merged;
        changed = true;
      }
    } catch {
      /* оставляем строку без изменений */
    }
  }
  if (changed) {
    persist(next);
  }
  return changed;
}

export function addPurchaseToCart(purchase: Purchase, quantity = 1) {
  void quantity;
  const cart = getCart();
  const idx = cart.findIndex((l) => l.purchaseId === purchase.id);
  const line = cartLineFromPurchase(purchase, idx >= 0 ? cart[idx] : undefined);
  if (idx >= 0) {
    cart[idx] = line;
  } else {
    cart.push(line);
  }
  persist(cart);
}

export function updateCartLineQuantity(purchaseId: number, quantity: number) {
  const cart = getCart();
  const i = cart.findIndex((l) => l.purchaseId === purchaseId);
  if (i < 0) {
    return;
  }
  void quantity;
  cart[i] = { ...cart[i], quantity: 1 };
  persist(cart);
}

export function removeCartLine(purchaseId: number) {
  persist(getCart().filter((l) => l.purchaseId !== purchaseId));
}

export function cartTotalQuantity(): number {
  return getCart().reduce((s, l) => s + l.quantity, 0);
}

export function cartSubtotalRub(): number {
  return getCart().reduce((s, l) => {
    const unit = Number(String(l.unitPrice).replace(",", "."));
    return s + (Number.isFinite(unit) ? unit * l.quantity : 0);
  }, 0);
}

export function subscribeToCartChanges(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT_NAME, handler);
  };
}

export function canReserveInCart(purchase: Purchase): boolean {
  const joined = purchase.my_quantity != null && purchase.my_quantity > 0;
  if (joined && purchase.status === "closed") {
    return true;
  }
  if (purchase.status !== "collecting" && purchase.status !== "closed") {
    return false;
  }
  return new Date(purchase.deadline).getTime() > Date.now();
}
