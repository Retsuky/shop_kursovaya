jest.mock("../../src/config/db", () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

const request = require("supertest");
const { createApp } = require("../helpers/createApp");

describe("GET /api/health", () => {
  test("200", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/running/i);
  });
});
