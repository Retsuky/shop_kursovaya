const { MAX_PG_INT, parsePgIntId, parsePgIntIdList } = require("../../src/lib/parsePgIntId");

describe("parsePgIntId", () => {
  test("принимает валидный id", () => {
    expect(parsePgIntId("1")).toBe(1);
    expect(parsePgIntId(2)).toBe(2);
    expect(parsePgIntId(MAX_PG_INT)).toBe(MAX_PG_INT);
  });

  test("отклоняет невалидные значения", () => {
    expect(parsePgIntId(null)).toBeNull();
    expect(parsePgIntId("")).toBeNull();
    expect(parsePgIntId("abc")).toBeNull();
    expect(parsePgIntId(-1)).toBeNull();
    expect(parsePgIntId(0)).toBeNull();
    expect(parsePgIntId(999999999999)).toBeNull();
    expect(parsePgIntId(3.14)).toBeNull();
  });
});

describe("parsePgIntIdList", () => {
  test("парсит CSV", () => {
    expect(parsePgIntIdList("1,2,2,3")).toEqual([1, 2, 3]);
  });

  test("пустая строка", () => {
    expect(parsePgIntIdList("")).toEqual([]);
    expect(parsePgIntIdList("  ")).toEqual([]);
  });

  test("ограничение maxCount", () => {
    const many = Array.from({ length: 60 }, (_, i) => String(i + 1)).join(",");
    expect(parsePgIntIdList(many, 3)).toHaveLength(3);
  });
});
