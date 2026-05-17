describe("api SSR", () => {
  test("interceptor без window", async () => {
    const original = global.window;
    // @ts-expect-error SSR
    delete global.window;
    jest.resetModules();
    const { default: api } = await import("./api");
    const cfg = await api.interceptors.request.handlers[0].fulfilled({ headers: {} });
    expect((cfg.headers as Record<string, string>).Authorization).toBeUndefined();
    global.window = original;
  });
});
