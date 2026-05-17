import type { Purchase } from "./purchasesMeta";
import api from "./api";

jest.mock("./api", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
import {
  addPurchaseToCart,
  canReserveInCart,
  cartSubtotalRub,
  cartTotalQuantity,
  clearCart,
  getCart,
  isCartLineGroupMinimumMet,
  removeCartLine,
  refreshCartLinesFromServer,
  setCart,
  subscribeToCartChanges,
  updateCartLineQuantity,
  type CartLine,
} from "./cart";

const purchase: Purchase = {
  id: 1,
  organizer_id: 2,
  title: "Deal",
  description: "",
  product_name: "P",
  unit_price: "100",
  min_participants: 2,
  deadline: new Date(Date.now() + 86400000).toISOString(),
  city: "M",
  pickup_address: "A",
  status: "collecting",
  created_at: "",
  updated_at: "",
  participant_count: 0,
  retail_price: "150",
  image_url: "/uploads/x.jpg",
};

describe("cart", () => {
  beforeEach(() => clearCart());

  test("добавление и подсчёты", () => {
    addPurchaseToCart(purchase);
    expect(getCart()).toHaveLength(1);
    expect(cartTotalQuantity()).toBe(1);
    expect(cartSubtotalRub()).toBeGreaterThan(0);
    removeCartLine(1);
    expect(getCart()).toHaveLength(0);
  });

  test("getCart — битые данные", () => {
    window.localStorage.setItem("shop_cart_v1", "not-json");
    expect(getCart()).toEqual([]);
    window.localStorage.setItem("shop_cart_v1", JSON.stringify({}));
    expect(getCart()).toEqual([]);
  });

  test("isCartLineGroupMinimumMet и canReserveInCart", () => {
    const line: CartLine = {
      purchaseId: 1,
      title: "T",
      productName: "P",
      unitPrice: "100",
      imageUrl: "",
      quantity: 1,
      purchaseStatus: "collecting",
      minParticipants: 2,
      participantCount: 2,
    };
    expect(isCartLineGroupMinimumMet(line)).toBe(true);
    expect(canReserveInCart(purchase)).toBe(true);
    setCart([line]);
    expect(getCart()[0].purchaseId).toBe(1);
    updateCartLineQuantity(1, 2);
    expect(getCart()[0].quantity).toBe(1);
    expect(canReserveInCart({ ...purchase, status: "completed" })).toBe(false);
    expect(canReserveInCart({ ...purchase, my_quantity: 1, status: "closed" })).toBe(true);
  });

  test("refreshCartLinesFromServer", async () => {
    addPurchaseToCart(purchase);
    (api.get as jest.Mock).mockResolvedValue({
      data: { purchase: { ...purchase, participant_count: 2, unit_price: "80" } },
    });
    await expect(refreshCartLinesFromServer()).resolves.toBe(true);
    const unsub = subscribeToCartChanges(() => undefined);
    unsub();
  });
});
