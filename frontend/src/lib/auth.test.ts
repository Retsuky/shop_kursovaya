import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
  subscribeToAuthChanges,
} from "./auth";

describe("auth session", () => {
  test("save/get/clear", () => {
    saveAuthSession({
      token: "t",
      user: { id: 1, name: "A", email: "a@t.ru", created_at: "" },
    });
    expect(getAuthSession()?.token).toBe("t");
    const unsub = subscribeToAuthChanges(() => undefined);
    clearAuthSession();
    expect(getAuthSession()).toBeNull();
    unsub();
  });

  test("битый JSON", () => {
    window.localStorage.setItem("shop_auth_session", "{");
    expect(getAuthSession()).toBeNull();
  });

  test("subscribe вызывает callback", () => {
    const fn = jest.fn();
    const unsub = subscribeToAuthChanges(fn);
    saveAuthSession({
      token: "t2",
      user: { id: 2, name: "B", email: "b@t.ru", created_at: "" },
    });
    expect(fn).toHaveBeenCalled();
    unsub();
  });
});
