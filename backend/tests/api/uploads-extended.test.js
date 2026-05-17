jest.mock("../../src/config/db", () => ({ query: jest.fn() }));

const request = require("supertest");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");

describe("uploads API — доп. ветки", () => {
  test("webp и gif", async () => {
    const buf = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    const gif = await request(createApp())
      .post("/api/uploads")
      .set(authHeader())
      .attach("file", buf, { filename: "x.gif", contentType: "image/gif" });
    expect(gif.status).toBe(201);

    const webp = await request(createApp())
      .post("/api/uploads")
      .set(authHeader())
      .attach("file", buf, { filename: "x.webp", contentType: "image/webp" });
    expect(webp.status).toBe(201);
  });

  test("jpeg по mimetype", async () => {
    const buf = Buffer.alloc(10);
    const res = await request(createApp())
      .post("/api/uploads")
      .set(authHeader())
      .attach("file", buf, { filename: "x.unknown", contentType: "image/jpeg" });
    expect(res.status).toBe(201);
  });

  test("слишком большой файл", async () => {
    const big = Buffer.alloc(6 * 1024 * 1024);
    const res = await request(createApp())
      .post("/api/uploads")
      .set(authHeader())
      .attach("file", big, { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/5 МБ/);
  });
});
