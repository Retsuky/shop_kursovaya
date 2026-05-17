/**
 * В API-тестах намеренно провоцируем ошибки БД (ответ 500).
 * Роуты логируют их через console.error — в прогоне тестов это не считается падением.
 */
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
