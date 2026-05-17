import {
  formatRub,
  formatTimeLeft,
  isGroupMinimumMet,
  resolvePurchaseUnitPriceRaw,
  purchasePricePresentation,
  catalogProgress,
  hasParticipantResponse,
  discountPercent,
  isAlmostFull,
  mapPurchaseToTrendingDeal,
} from "./catalogDisplay";
import type { Purchase } from "./purchasesMeta";

function basePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 1,
    organizer_id: 1,
    title: "T",
    description: "",
    product_name: "P",
    unit_price: "500",
    min_participants: 3,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    city: "",
    pickup_address: "",
    status: "collecting",
    created_at: "",
    updated_at: "",
    participant_count: 1,
    retail_price: "700",
    ...overrides,
  };
}

describe("catalogDisplay", () => {
  test("formatRub и formatTimeLeft", () => {
    expect(formatRub("1000")).toContain("₽");
    expect(formatRub("x")).toBe("—");
    expect(formatTimeLeft(new Date(Date.now() - 1000).toISOString())).toBe("Срок истёк");
    expect(formatTimeLeft(new Date(Date.now() + 90000000).toISOString())).toMatch(/осталось/);
  });

  test("цены и скидки", () => {
    const p = basePurchase();
    expect(isGroupMinimumMet(p)).toBe(false);
    expect(isGroupMinimumMet(basePurchase({ status: "cancelled" }))).toBe(false);
    expect(isGroupMinimumMet(basePurchase({ status: "closed" }))).toBe(true);
    expect(resolvePurchaseUnitPriceRaw(p)).toBe("700");
    expect(resolvePurchaseUnitPriceRaw(basePurchase({ retail_price: null }))).toBe("500");
    expect(purchasePricePresentation(p).mainPrice).toContain("₽");
    expect(purchasePricePresentation(basePurchase({ participant_count: 3 })).caption).toMatch(/минимум набран/);
    expect(purchasePricePresentation(basePurchase({ retail_price: null })).caption).toMatch(/минимум/);
    expect(discountPercent(basePurchase({ participant_count: 3, status: "collecting" }))).toBeGreaterThan(0);
    expect(discountPercent(basePurchase({ retail_price: null }))).toBeNull();
    expect(catalogProgress(p).percent).toBeGreaterThan(0);
    expect(hasParticipantResponse(basePurchase({ my_quantity: 1 }))).toBe(true);
    expect(isAlmostFull(basePurchase({ participant_count: 3, min_participants: 3 }))).toBe(true);
    expect(isAlmostFull(basePurchase({ status: "closed" }))).toBe(false);
    expect(formatTimeLeft(basePurchase().deadline)).toMatch(/осталось/);
    const deal = mapPurchaseToTrendingDeal(
      basePurchase({ participant_count: 4, min_participants: 6, status: "collecting" })
    );
    expect(deal.cta.label).toBeTruthy();
    expect(deal.extraParticipantsLabel).toMatch(/\+/);
    const needMore = mapPurchaseToTrendingDeal(basePurchase({ participant_count: 1, min_participants: 5 }));
    expect(needMore.footerHint).toMatch(/Нужно ещё/);
  });
});
