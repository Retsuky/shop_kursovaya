const { fuzzObject, fuzzScalar, request, FuzzStats, randomString, pick } = require("./fuzz-utils");

async function tryLogin(baseUrl, email, password) {
  return request(baseUrl, {
    method: "POST",
    path: "/api/auth/login",
    body: { email, password },
  });
}

async function obtainToken(baseUrl) {
  const email = process.env.FUZZ_USER_EMAIL?.trim() || "admin@shop.local";
  const password = process.env.FUZZ_USER_PASSWORD?.trim();
  if (!password) {
    console.warn("FUZZ_USER_PASSWORD не задан — JWT-сценарии fuzz пропускаются.");
    return null;
  }
  const res = await tryLogin(baseUrl, email, password);
  if (res.status !== 200 || !res.responseSnippet) {
    return null;
  }
  try {
    const data = JSON.parse(res.responseSnippet);
    return data.token || null;
  } catch {
    return null;
  }
}

async function runAuthFuzz(baseUrl, iterations) {
  const stats = new FuzzStats("auth");
  const token = await obtainToken(baseUrl);

  for (let i = 0; i < iterations; i += 1) {
    const label = `iter-${i}`;
    const badTokens = [
      "",
      "Bearer",
      "Bearer ",
      `Bearer ${randomString(32)}`,
      `Bearer ${pick(["null", "undefined", fuzzScalar()])}`,
      token ? `Bearer ${token}x` : "Bearer invalid.jwt.token",
    ];

    for (const authHeader of badTokens) {
      stats.record(
        await request(baseUrl, {
          method: "GET",
          path: "/api/auth/me",
          headers: authHeader ? { Authorization: authHeader } : {},
        }),
        { expectStatuses: [401], label: `${label} me bad token` }
      );
    }

    stats.record(
      await request(baseUrl, {
        method: "PATCH",
        path: "/api/auth/profile",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fuzzObject(),
      }),
      { expectStatuses: token ? [200, 400] : [401], label: `${label} profile fuzz` }
    );

    stats.record(
      await request(baseUrl, {
        method: "PATCH",
        path: "/api/auth/password",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fuzzObject(),
      }),
      { expectStatuses: token ? [400, 401] : [401], label: `${label} password fuzz` }
    );

    stats.record(
      await request(baseUrl, {
        method: "GET",
        path: "/api/notifications/",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
      { expectStatuses: token ? [200] : [401], label: `${label} notifications` }
    );

    stats.record(
      await request(baseUrl, {
        method: "GET",
        path: `/api/notifications/${fuzzScalar()}/read`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
      { expectStatuses: token ? [400, 404] : [401], label: `${label} notification read` }
    );
  }

  if (!token) {
    console.warn(
      "[fuzz-auth] Не удалось получить JWT (проверьте FUZZ_USER_EMAIL/FUZZ_USER_PASSWORD или bootstrap-админа). Часть сценариев пропущена."
    );
  }

  return stats;
}

module.exports = { runAuthFuzz, obtainToken };
