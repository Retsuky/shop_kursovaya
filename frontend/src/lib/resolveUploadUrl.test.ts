import { apiOrigin, resolveUploadUrl } from "./resolveUploadUrl";

describe("resolveUploadUrl", () => {
  const prev = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = prev;
  });

  test("apiOrigin и относительный путь", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3020/api";
    expect(apiOrigin()).toBe("http://localhost:3020");
    expect(resolveUploadUrl("/uploads/a.jpg")).toContain("/uploads/a.jpg");
    expect(resolveUploadUrl("")).toBe("");
  });

  test("абсолютный URL с uploads", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3020/api";
    expect(resolveUploadUrl("http://localhost:3020/uploads/x.png")).toContain("/uploads/x.png");
    expect(resolveUploadUrl("https://cdn.example.com/page")).toBe("https://cdn.example.com/page");
    expect(resolveUploadUrl("http://127.0.0.1:3020/uploads/y.jpg")).toContain("/uploads/y.jpg");
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api";
    expect(resolveUploadUrl("https://other.example/uploads/z.jpg")).toContain("/uploads/z.jpg");
    expect(resolveUploadUrl("https://api.example.com/uploads/same-host.jpg")).toBe(
      "https://api.example.com/uploads/same-host.jpg"
    );
  });

  test("невалидный NEXT_PUBLIC_API_URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "not-a-url";
    expect(apiOrigin()).toBe("http://localhost:3020");
  });
});
