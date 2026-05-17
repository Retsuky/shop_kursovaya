describe("auth SSR", () => {
  test("без window — no-op", async () => {
    const original = global.window;
    // @ts-expect-error тест SSR
    delete global.window;
    jest.resetModules();
    const { clearAuthSession, getAuthSession, saveAuthSession, subscribeToAuthChanges } = await import("./auth");
    expect(getAuthSession()).toBeNull();
    saveAuthSession({ token: "t", user: { id: 1, name: "A", email: "a@t.ru", created_at: "" } });
    clearAuthSession();
    expect(subscribeToAuthChanges(() => undefined)()).toBeUndefined();
    global.window = original;
  });
});
