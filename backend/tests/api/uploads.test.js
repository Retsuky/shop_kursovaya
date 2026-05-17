jest.mock("../../src/config/db", () => ({ query: jest.fn() }));

const path = require("path");
const fs = require("fs");
const request = require("supertest");
const { createApp } = require("../helpers/createApp");
const { authHeader } = require("../helpers/auth");

describe("uploads API", () => {
  test("401 без токена", async () => {
    const res = await request(createApp()).post("/api/uploads");
    expect(res.status).toBe(401);
  });

  test("400 без файла", async () => {
    const res = await request(createApp()).post("/api/uploads").set(authHeader());
    expect(res.status).toBe(400);
  });

  test("201 с изображением", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const res = await request(createApp())
      .post("/api/uploads")
      .set(authHeader())
      .attach("file", png, { filename: "tiny.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\/uploads\//);
  });

  test("400 неверный тип", async () => {
    const res = await request(createApp())
      .post("/api/uploads")
      .set(authHeader())
      .attach("file", Buffer.from("not-image"), { filename: "x.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });
});
