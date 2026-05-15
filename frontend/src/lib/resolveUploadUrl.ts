/** Origin API без суффикса /api (для /uploads/...). */
export function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3020/api";
  try {
    const u = new URL(raw.includes("/api") ? raw : `${raw.replace(/\/$/, "")}/api`);
    return u.origin;
  } catch {
    return "http://localhost:3020";
  }
}

export function resolveUploadUrl(url: string | undefined | null): string {
  const raw = url?.trim() ?? "";
  if (!raw) {
    return "";
  }

  const origin = apiOrigin();

  if (raw.startsWith("/uploads/")) {
    return `${origin}${raw}`;
  }

  try {
    const parsed = new URL(raw);
    if (!parsed.pathname.includes("/uploads/")) {
      return raw;
    }
    const apiHost = new URL(origin).hostname;
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname !== apiHost
    ) {
      return `${origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* не абсолютный URL */
  }

  return raw;
}
