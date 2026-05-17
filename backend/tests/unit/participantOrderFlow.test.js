jest.mock("../../src/config/db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
}));

const pool = require("../../src/config/db");
const { promoteAssemblyToProcessingAfterClose } = require("../../src/lib/participantOrderFlow");

describe("promoteAssemblyToProcessingAfterClose", () => {
  test("обновляет участников", async () => {
    await promoteAssemblyToProcessingAfterClose(pool, 5);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("participant_status = 'processing'"), [5]);
  });
});
