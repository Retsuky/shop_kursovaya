/**
 * Покрытие внутренних веток uploads.js (extFromMimetype, MulterError, publicBase).
 */
const jwt = require("jsonwebtoken");

jest.mock("multer", () => {
  const handlers = { singleHandler: null, filenameCb: null };

  class MulterError extends Error {
    constructor(code, msg) {
      super(msg || code);
      this.code = code;
      this.name = "MulterError";
    }
  }

  const multerFn = () => ({
    single: () => handlers.singleHandler,
  });
  multerFn.diskStorage = (opts) => {
    handlers.filenameCb = opts.filename;
  };
  multerFn.MulterError = MulterError;
  multerFn.__handlers = handlers;
  return multerFn;
});

jest.mock("../../src/config/db", () => ({ query: jest.fn() }));

describe("uploads route internals", () => {
  let handlers;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = "test-jwt-secret-for-unit-tests";
    handlers = require("multer").__handlers;
    handlers.singleHandler = (_req, _res, cb) => cb(null);
  });

  function appWithUpload() {
    const express = require("express");
    const routes = require("../../src/routes");
    const app = express();
    app.use(express.json());
    app.use("/api", routes);
    return app;
  }

  test("extFromMimetype — все ветки через filename callback", () => {
    require("../../src/routes/uploads");
    expect(handlers.filenameCb).toBeDefined();
    const cb = jest.fn();
    handlers.filenameCb({}, { originalname: "", mimetype: null }, cb);
    expect(cb.mock.calls[0][1]).toMatch(/\.img$/);

    handlers.filenameCb({}, { originalname: "photo.jpeg", mimetype: "image/png" }, cb);
    expect(cb.mock.calls[1][1]).toMatch(/\.jpg$/);

    handlers.filenameCb({}, { originalname: "x.unknown", mimetype: null }, cb);
    expect(cb.mock.calls[2][1]).toMatch(/\.img$/);

    handlers.filenameCb({}, { originalname: "a", mimetype: "image/jpeg" }, cb);
    expect(cb.mock.calls[3][1]).toMatch(/\.jpg$/);

    handlers.filenameCb({}, { originalname: "a", mimetype: "image/png" }, cb);
    expect(cb.mock.calls[4][1]).toMatch(/\.png$/);

    handlers.filenameCb({}, { originalname: "a", mimetype: "image/gif" }, cb);
    expect(cb.mock.calls[5][1]).toMatch(/\.gif$/);

    handlers.filenameCb({}, { originalname: "a", mimetype: "image/webp" }, cb);
    expect(cb.mock.calls[6][1]).toMatch(/\.webp$/);

    handlers.filenameCb({}, { originalname: "a", mimetype: "image/foo" }, cb);
    expect(cb.mock.calls[7][1]).toMatch(/\.img$/);
  });

  test("MulterError — не LIMIT_FILE_SIZE", async () => {
    const request = require("supertest");
    const { MulterError } = require("multer");
    handlers.singleHandler = (_req, _res, cb) => cb(new MulterError("LIMIT_FIELD_COUNT"));
    const token = jwt.sign({ id: 1, email: "a@t.ru", is_admin: true }, process.env.JWT_SECRET);
    const res = await request(appWithUpload())
      .post("/api/uploads")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Не удалось принять файл/);
  });

  test("publicBase — протокол не http/https", async () => {
    const request = require("supertest");
    delete process.env.PUBLIC_BASE_URL;
    handlers.singleHandler = (req, _res, cb) => {
      req.file = { filename: "x.png" };
      req.protocol = "ftp";
      req.get = (name) => (name === "host" ? "example.com" : undefined);
      cb(null);
    };
    const token = jwt.sign({ id: 1, email: "a@t.ru" }, process.env.JWT_SECRET);
    const res = await request(appWithUpload())
      .post("/api/uploads")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^http:\/\/example.com/);
    process.env.PUBLIC_BASE_URL = "http://localhost:3020";
  });

  test("publicBase — https и fallback host без PORT", async () => {
    const request = require("supertest");
    process.env.PUBLIC_BASE_URL = "";
    delete process.env.PORT;
    handlers.singleHandler = (req, _res, cb) => {
      req.file = { filename: "x.png" };
      Object.defineProperty(req, "protocol", { value: "https", configurable: true });
      req.get = () => undefined;
      cb(null);
    };
    const token = jwt.sign({ id: 1, email: "a@t.ru" }, process.env.JWT_SECRET);
    const res = await request(appWithUpload()).post("/api/uploads").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^https:\/\/localhost:3020/);
    process.env.PUBLIC_BASE_URL = "http://localhost:3020";
  });

  test("publicBase — http без PUBLIC_BASE_URL", async () => {
    const request = require("supertest");
    process.env.PUBLIC_BASE_URL = "";
    handlers.singleHandler = (req, _res, cb) => {
      req.file = { filename: "x.png" };
      Object.defineProperty(req, "protocol", { value: "http", configurable: true });
      req.get = (name) => (name === "host" ? "myhost.test" : undefined);
      cb(null);
    };
    const token = jwt.sign({ id: 1, email: "a@t.ru" }, process.env.JWT_SECRET);
    const res = await request(appWithUpload()).post("/api/uploads").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^http:\/\/myhost\.test/);
    process.env.PUBLIC_BASE_URL = "http://localhost:3020";
  });
});
