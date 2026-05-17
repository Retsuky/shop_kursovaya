import {
  CATALOG_VISIBLE_STATUSES,
  getNextStatus,
  STATUS_LABELS,
  STATUS_ORDER,
} from "./purchasesMeta";

describe("purchasesMeta", () => {
  test("getNextStatus", () => {
    expect(getNextStatus("collecting")).toBe("closed");
    expect(getNextStatus("completed")).toBeNull();
    expect(getNextStatus("unknown")).toBeNull();
  });

  test("STATUS_LABELS", () => {
    expect(STATUS_LABELS.collecting).toBeTruthy();
    expect(STATUS_LABELS.pending_review).toBeTruthy();
    expect(STATUS_LABELS.rejected).toBeTruthy();
  });

  test("getNextStatus closed", () => {
    expect(getNextStatus("closed")).toBe("completed");
  });

  test("STATUS_ORDER", () => {
    expect(STATUS_ORDER).toContain("collecting");
  });

  test("CATALOG_VISIBLE_STATUSES", () => {
    expect(CATALOG_VISIBLE_STATUSES.has("collecting")).toBe(true);
    expect(CATALOG_VISIBLE_STATUSES.has("cancelled")).toBe(false);
  });
});
