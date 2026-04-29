import type { Purchase } from "./purchasesMeta";

const STORAGE_KEY = "shop_cart_v1";
const EVENT_NAME = "shop-cart-changed";

export type CartLine = {
  purchaseId: number;
  title: string;
  productName: string;
  unitPrice: string;
  imageUrl: string;
  quantity: number;
};

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
    return parsed.filter(
      (row): row is CartLine =>
        row != null &&
        typeof row === "object" &&
        typeof (row as CartLine).purchaseId === "number" &&
        typeof (row as CartLine).quantity === "number" &&
        (row as CartLine).quantity > 0
    );
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

export function addPurchaseToCart(purchase: Purchase, quantity = 1) {
  const q = Math.max(1, Math.floor(quantity));
  const cart = getCart();
  const imageUrl =
    purchase.image_url?.trim() ||
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBinnOgENAwDx3Cjp4dVQm-QPyT4K0FmppHETJ1UnhzbQsh62rTK2YvmP_W003pxfxsduHErVaUoTQJDB0OQI-TN0IaGqKWAwigtEK0CAWzyhAZcmaZLKT4GKKO9jN_HVFJRkLvJDXEF0a4FvCwVcaSQIDXiotXhGcn1k40KUYuV1SpsP7OQc7Dcue_o7XY-bZziQ2HKMJeTsOlzM7e7HExDDB6RH8HNaEV-NwTL0SYEZpkEOJf_r5ztszeFh_qZxDqjTfmC_IgDK0";
  const idx = cart.findIndex((l) => l.purchaseId === purchase.id);
  if (idx >= 0) {
    cart[idx] = {
      ...cart[idx],
      quantity: cart[idx].quantity + q,
      title: purchase.title,
      productName: purchase.product_name,
      unitPrice: purchase.unit_price,
      imageUrl,
    };
  } else {
    cart.push({
      purchaseId: purchase.id,
      title: purchase.title,
      productName: purchase.product_name,
      unitPrice: purchase.unit_price,
      imageUrl,
      quantity: q,
    });
  }
  persist(cart);
}

export function updateCartLineQuantity(purchaseId: number, quantity: number) {
  const q = Math.floor(quantity);
  const cart = getCart();
  const i = cart.findIndex((l) => l.purchaseId === purchaseId);
  if (i < 0) {
    return;
  }
  if (q < 1) {
    cart.splice(i, 1);
  } else {
    cart[i] = { ...cart[i], quantity: q };
  }
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
  if (purchase.status !== "collecting") {
    return false;
  }
  return new Date(purchase.deadline).getTime() > Date.now();
}
