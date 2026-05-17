/**
 * Утилиты для HTTP-фаззинга API (без внешних зависимостей).
 */

const SQLISH = [
  "' OR '1'='1",
  '"; DROP TABLE users; --',
  "1; SELECT * FROM users",
  "%00admin",
  "{{7*7}}",
  "<script>alert(1)</script>",
];

const UNICODE = ["\u0000", "\u202e", "тест", "🛒", "\ufeff", "a".repeat(5000)];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-%./\\";
  let s = "";
  for (let i = 0; i < len; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function fuzzScalar() {
  const pool = [
    null,
    undefined,
    "",
    " ",
    0,
    -1,
    999999999999,
    3.14,
    true,
    false,
    [],
    {},
    { nested: { a: 1 } },
    pick(SQLISH),
    pick(UNICODE),
    randomString(randomInt(0, 200)),
    randomString(8000),
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ];
  return pick(pool);
}

function fuzzObject(depth = 2) {
  if (depth <= 0) {
    return fuzzScalar();
  }
  const keys = ["id", "email", "password", "name", "title", "status", "body", "__proto__", "constructor"];
  const obj = {};
  const n = randomInt(0, 8);
  for (let i = 0; i < n; i += 1) {
    obj[pick(keys) + randomString(4)] = Math.random() > 0.5 ? fuzzScalar() : fuzzObject(depth - 1);
  }
  return obj;
}

function fuzzQueryValue() {
  return encodeURIComponent(String(fuzzScalar() ?? ""));
}

function buildQuery(params = {}) {
  const parts = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${fuzzQueryValue()}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

async function request(baseUrl, { method = "GET", path = "/", headers = {}, body = undefined, timeoutMs = 15000 }) {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let serialized;
  const hdrs = { ...headers };
  if (body !== undefined) {
    if (typeof body === "string") {
      serialized = body;
      hdrs["Content-Type"] = hdrs["Content-Type"] || "application/json";
    } else if (Buffer.isBuffer(body)) {
      serialized = body;
    } else {
      try {
        serialized = JSON.stringify(body);
        hdrs["Content-Type"] = hdrs["Content-Type"] || "application/json";
      } catch {
        serialized = String(body);
      }
    }
  }

  const started = Date.now();
  let status = 0;
  let ok = false;
  let error = null;
  let responseBody = "";

  try {
    const res = await fetch(url, {
      method,
      headers: hdrs,
      body: serialized,
      signal: controller.signal,
    });
    status = res.status;
    ok = res.ok;
    responseBody = (await res.text()).slice(0, 500);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
  }

  return {
    url,
    method,
    status,
    ok,
    error,
    durationMs: Date.now() - started,
    responseSnippet: responseBody,
  };
}

class FuzzStats {
  constructor(name) {
    this.name = name;
    this.total = 0;
    this.byStatus = new Map();
    this.errors = [];
    this.serverErrors = [];
    this.unexpectedSuccess = [];
  }

  record(result, { expectStatuses, label }) {
    this.total += 1;
    const key = result.error ? "network" : String(result.status);
    this.byStatus.set(key, (this.byStatus.get(key) || 0) + 1);

    if (result.error) {
      this.errors.push({ label, ...result });
      return;
    }

    if (result.status >= 500) {
      this.serverErrors.push({ label, ...result });
    }

    if (expectStatuses && !expectStatuses.includes(result.status)) {
      if (result.status < 500) {
        this.unexpectedSuccess.push({ label, status: result.status, url: result.url });
      }
    }
  }

  summary() {
    const statuses = [...this.byStatus.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    return {
      suite: this.name,
      total: this.total,
      statuses,
      serverErrorCount: this.serverErrors.length,
      networkErrorCount: this.errors.length,
    };
  }
}

function printReport(suites) {
  console.log("\n=== Отчёт фаззинга ===\n");
  let failed = false;
  for (const s of suites) {
    const sum = s.summary();
    console.log(`[${sum.suite}] запросов: ${sum.total}, статусы: ${sum.statuses}`);
    if (sum.serverErrorCount > 0) {
      failed = true;
      console.log(`  HTTP 5xx: ${sum.serverErrorCount} (первые 5):`);
      for (const e of s.serverErrors.slice(0, 5)) {
        console.log(`    - ${e.label} → ${e.status} ${e.url}`);
      }
    }
    if (sum.networkErrorCount > 0) {
      console.log(`  Сетевые ошибки: ${sum.networkErrorCount}`);
    }
  }
  console.log("");
  return failed;
}

module.exports = {
  SQLISH,
  pick,
  randomInt,
  randomString,
  fuzzScalar,
  fuzzObject,
  fuzzQueryValue,
  buildQuery,
  request,
  FuzzStats,
  printReport,
};
