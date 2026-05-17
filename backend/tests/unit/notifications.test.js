const {
  createNotification,
  notifyPurchaseAudience,
  notifyStatusChange,
  notifyParticipantDeliveryStatusChange,
  notifyGroupDiscountReached,
  statusLabel,
  deliveryStatusLabel,
} = require("../../src/services/notifications");

describe("notifications service", () => {
  test("statusLabel и deliveryStatusLabel", () => {
    expect(statusLabel("collecting")).toBe("Сбор заявок");
    expect(statusLabel("unknown")).toBe("unknown");
    expect(deliveryStatusLabel("handed")).toBe("Вручен");
    expect(deliveryStatusLabel("unknown")).toBe("unknown");
  });

  test("notifyStatusChange с пустым title", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ title: undefined }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 1, title: "D" }] })
        .mockResolvedValueOnce({ rows: [] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      }),
    };
    await notifyStatusChange(pool, 1, "collecting", "closed");
  });

  test("notifyStatusChange без названия сделки", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 1, title: "D" }] })
        .mockResolvedValueOnce({ rows: [] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      }),
    };
    await notifyStatusChange(pool, 1, "collecting", "closed");
  });

  test("createNotification пропускает пустые", async () => {
    const client = { query: jest.fn() };
    await createNotification(client, { userId: 0, title: "x" });
    await createNotification(client, { userId: 1, title: "" });
    expect(client.query).not.toHaveBeenCalled();
  });

  test("createNotification вставляет", async () => {
    const client = { query: jest.fn().mockResolvedValue({}) };
    await createNotification(client, { userId: 1, purchaseId: 2, title: "T", body: "B" });
    expect(client.query).toHaveBeenCalled();
  });

  test("createNotification без body", async () => {
    const client = { query: jest.fn().mockResolvedValue({}) };
    await createNotification(client, { userId: 1, title: "T" });
    expect(client.query).toHaveBeenCalled();
  });

  test("createNotification title/type null", async () => {
    const client = { query: jest.fn().mockResolvedValue({}) };
    await createNotification(client, { userId: 1, title: null, body: null, type: null });
    expect(client.query).not.toHaveBeenCalled();
    await createNotification(client, { userId: 1, title: "Ok", type: null, body: "b" });
    expect(client.query).toHaveBeenCalled();
  });

  test("createNotification с purchaseId null", async () => {
    const client = { query: jest.fn().mockResolvedValue({}) };
    await createNotification(client, { userId: 1, purchaseId: null, title: "T", body: "b" });
    expect(client.query).toHaveBeenCalled();
  });

  test("createNotification с type", async () => {
    const client = { query: jest.fn().mockResolvedValue({}) };
    await createNotification(client, {
      userId: 1,
      type: "x".repeat(60),
      title: "T",
      body: "",
    });
    expect(client.query).toHaveBeenCalled();
  });

  test("notifyPurchaseAudience с excludeUserIds", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 10, title: "Deal" }] })
        .mockResolvedValueOnce({ rows: [{ user_id: 10 }, { user_id: 11 }] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      }),
    };
    await notifyPurchaseAudience(pool, 1, { title: "Hi", body: "Body", excludeUserIds: [10] });
  });

  test("notifyPurchaseAudience", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 10, title: "Deal" }] })
        .mockResolvedValueOnce({ rows: [{ user_id: 11 }] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      }),
    };
    await notifyPurchaseAudience(pool, 1, { title: "Hi", body: "Body" });
    expect(pool.connect).toHaveBeenCalled();
  });

  test("notifyPurchaseAudience без сделки", async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    await notifyPurchaseAudience(pool, 999, { title: "x", body: "y" });
  });

  test("notifyStatusChange", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ title: "D" }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 1, title: "D" }] })
        .mockResolvedValueOnce({ rows: [] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      }),
    };
    await notifyStatusChange(pool, 1, "collecting", "closed");
  });

  test("notifyParticipantDeliveryStatusChange", async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [{ title: "D" }] }),
    };
    await notifyParticipantDeliveryStatusChange(pool, 1, 5, "assembly", "processing");
  });

  test("notifyParticipantDeliveryStatusChange без title", async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    await notifyParticipantDeliveryStatusChange(pool, 1, 5, "assembly", "processing");
  });

  test("notifyPurchaseAudience — rollback при ошибке", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 10, title: "Deal" }] })
        .mockResolvedValueOnce({ rows: [{ user_id: 11 }] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue({}),
        release: jest.fn(),
      }),
    };
    await expect(
      notifyPurchaseAudience(pool, 1, { title: "Hi", body: "Body" })
    ).rejects.toThrow("fail");
  });

  test("notifyGroupDiscountReached без названия", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 1, title: "D" }] })
        .mockResolvedValueOnce({ rows: [] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      }),
    };
    await notifyGroupDiscountReached(pool, 1);
  });

  test("notifyGroupDiscountReached", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ title: "D" }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, organizer_id: 1, title: "D" }] })
        .mockResolvedValueOnce({ rows: [] }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({}),
        release: jest.fn(),
      }),
    };
    await notifyGroupDiscountReached(pool, 1);
  });
});
