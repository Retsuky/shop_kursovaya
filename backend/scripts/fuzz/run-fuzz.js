#!/usr/bin/env node
/**
 * Запуск HTTP-фаззинга REST API.
 *
 * Требования: запущенный backend + PostgreSQL.
 *
 *   node scripts/fuzz/run-fuzz.js
 *   FUZZ_ITERATIONS=30 FUZZ_BASE_URL=http://localhost:3020 node scripts/fuzz/run-fuzz.js
 */

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const { printReport } = require("./fuzz-utils");
const { runPublicFuzz } = require("./fuzz-public");
const { runAuthFuzz } = require("./fuzz-auth");
const { runPurchasesFuzz } = require("./fuzz-purchases");
const { runAdminFuzz } = require("./fuzz-admin");

const baseUrl = (process.env.FUZZ_BASE_URL || "http://localhost:3020").replace(/\/api\/?$/, "");
const iterations = Math.max(1, Math.min(500, Number(process.env.FUZZ_ITERATIONS) || 15));
const seed = process.env.FUZZ_SEED;

if (seed !== undefined && seed !== "") {
  let s = Number(seed);
  if (!Number.isFinite(s)) {
    s = [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0);
  }
  let state = s >>> 0;
  Math.random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  console.log(`Seed фаззинга: ${seed}`);
}

async function checkHealth() {
  const url = `${baseUrl}/api/health`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return true;
  } catch (err) {
    console.error(`API недоступен (${url}): ${err instanceof Error ? err.message : err}`);
    console.error("Запустите backend: pnpm --dir backend run dev");
    return false;
  }
}

async function main() {
  console.log(`Фаззинг CoBuy API → ${baseUrl}`);
  console.log(`Итераций на сьют: ${iterations}\n`);

  if (!(await checkHealth())) {
    process.exit(2);
  }

  const suites = [];

  suites.push(await runPublicFuzz(baseUrl, iterations));
  suites.push(await runAuthFuzz(baseUrl, iterations));
  suites.push(await runPurchasesFuzz(baseUrl, iterations));
  suites.push(await runAdminFuzz(baseUrl, iterations));

  const failed = printReport(suites);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
