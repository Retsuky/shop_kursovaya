import { tierLabel } from "./accountTier";

describe("tierLabel", () => {
  test("уровни", () => {
    expect(tierLabel(0, 0)).toBe("Новый участник");
    expect(tierLabel(1, 0)).toBe("Активный участник");
    expect(tierLabel(3, 2)).toBe("Золотой участник");
    expect(tierLabel(10, 5)).toBe("Платиновый участник");
  });
});
