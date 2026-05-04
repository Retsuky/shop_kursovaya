import axios from "axios";
import api from "./api";

export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await api.post<{ url: string }>("/uploads", formData);
    if (!data?.url || typeof data.url !== "string") {
      throw new Error("Некорректный ответ сервера.");
    }
    return data.url.trim();
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const msg = e.response?.data?.message;
      throw new Error(typeof msg === "string" ? msg : "Не удалось загрузить файл.");
    }
    throw e;
  }
}
