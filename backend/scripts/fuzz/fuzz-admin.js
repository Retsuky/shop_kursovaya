const { fuzzObject, fuzzScalar, request, FuzzStats, pick, randomInt } = require("./fuzz-utils");
const { obtainToken } = require("./fuzz-auth");

async function runAdminFuzz(baseUrl, iterations) {
  const stats = new FuzzStats("admin");
  const token = await obtainToken(baseUrl);
  if (!token) {
    console.warn("[fuzz-admin] JWT не получен — сценарии admin пропущены.");
    return stats;
  }

  const auth = { Authorization: `Bearer ${token}` };

  for (let i = 0; i < iterations; i += 1) {
    const label = `iter-${i}`;
    const id = pick([fuzzScalar(), randomInt(0, 999999), 1]);

    stats.record(
      await request(baseUrl, { method: "GET", path: "/api/admin/users", headers: auth }),
      { expectStatuses: [200, 403], label: `${label} users` }
    );

    stats.record(
      await request(baseUrl, {
        method: "PATCH",
        path: `/api/admin/users/${id}`,
        headers: auth,
        body: fuzzObject(),
      }),
      { expectStatuses: [400, 403, 404], label: `${label} patch user` }
    );

    stats.record(
      await request(baseUrl, { method: "GET", path: "/api/admin/purchases", headers: auth }),
      { expectStatuses: [200, 403], label: `${label} purchases` }
    );

    stats.record(
      await request(baseUrl, {
        method: "PATCH",
        path: `/api/admin/purchases/${id}`,
        headers: auth,
        body: fuzzObject(),
      }),
      { expectStatuses: [400, 403, 404], label: `${label} patch purchase` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: `/api/admin/purchases/${id}/approve`,
        headers: auth,
      }),
      { expectStatuses: [400, 403, 404], label: `${label} approve` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: `/api/admin/purchases/${id}/reject`,
        headers: auth,
      }),
      { expectStatuses: [400, 403, 404], label: `${label} reject` }
    );

    stats.record(
      await request(baseUrl, {
        method: "PATCH",
        path: `/api/admin/purchases/${id}/participants/${id}`,
        headers: auth,
        body: fuzzObject(),
      }),
      { expectStatuses: [400, 403, 404], label: `${label} patch participant` }
    );

    stats.record(
      await request(baseUrl, { method: "GET", path: "/api/admin/submissions", headers: auth }),
      { expectStatuses: [200, 403], label: `${label} submissions` }
    );
  }

  return stats;
}

module.exports = { runAdminFuzz };
