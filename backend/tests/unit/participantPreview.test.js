const { normalizeParticipantPreview } = require("../../src/lib/participantPreview");

describe("normalizeParticipantPreview", () => {
  test("пустые значения", () => {
    expect(normalizeParticipantPreview(null)).toEqual([]);
    expect(normalizeParticipantPreview(undefined)).toEqual([]);
  });

  test("JSON-строка", () => {
    const raw = JSON.stringify([{ user_id: 1, user_name: "A", email: "a@t.ru", avatar_url: "" }]);
    expect(normalizeParticipantPreview(raw)).toHaveLength(1);
  });

  test("битый JSON", () => {
    expect(normalizeParticipantPreview("{")).toEqual([]);
  });

  test("не массив", () => {
    expect(normalizeParticipantPreview({})).toEqual([]);
  });

  test("элементы с пустыми полями", () => {
    expect(normalizeParticipantPreview([{ user_id: "2" }])).toEqual([
      { user_id: 2, user_name: "", email: "", avatar_url: "" },
    ]);
  });
});
