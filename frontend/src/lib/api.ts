import axios from "axios";
import { getAuthSession } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const session = getAuthSession();

    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  }

  return config;
});

export default api;
