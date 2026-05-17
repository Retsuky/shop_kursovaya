import axios from "axios";
import api from "./api";
import { uploadProductImage } from "./uploadProductImage";

jest.mock("./api", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

describe("uploadProductImage", () => {
  test("успешная загрузка", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { url: " http://x/u " } });
    const file = new File(["x"], "a.png", { type: "image/png" });
    await expect(uploadProductImage(file)).resolves.toBe("http://x/u");
  });

  test("некорректный ответ", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    await expect(uploadProductImage(new File([], "a.png"))).rejects.toThrow("Некорректный ответ");
  });

  test("не axios ошибка пробрасывается", async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error("network"));
    await expect(uploadProductImage(new File([], "a.png"))).rejects.toThrow("network");
  });

  test("ошибка без message", async () => {
    (api.post as jest.Mock).mockRejectedValue(new axios.AxiosError("fail"));
    await expect(uploadProductImage(new File([], "a.png"))).rejects.toThrow("Не удалось загрузить");
  });

  test("ошибка axios", async () => {
    (api.post as jest.Mock).mockRejectedValue(
      new axios.AxiosError("fail", undefined, undefined, undefined, {
        status: 400,
        data: { message: "Ошибка сервера" },
        statusText: "",
        headers: {},
        config: {} as never,
      })
    );
    await expect(uploadProductImage(new File([], "a.png"))).rejects.toThrow("Ошибка сервера");
  });
});
