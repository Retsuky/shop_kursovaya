import api from "./api";
import { saveAuthSession, clearAuthSession } from "./auth";

describe("api interceptor", () => {
  afterEach(() => clearAuthSession());

  test("без сессии заголовок не ставится", async () => {
    clearAuthSession();
    const handler = api.interceptors.request;
    const cfg = await handler.handlers[0].fulfilled({ headers: {} });
    expect((cfg.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  test("добавляет Authorization при сессии", async () => {
    saveAuthSession({
      token: "abc",
      user: { id: 1, name: "A", email: "a@t.ru", created_at: "" },
    });
    const handler = api.interceptors.request;
    const cfg = await handler.handlers[0].fulfilled({ headers: {} });
    expect((cfg.headers as Record<string, string>).Authorization).toBe("Bearer abc");
  });
});
