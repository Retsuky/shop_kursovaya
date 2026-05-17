const { fuzzObject, fuzzScalar, fuzzQueryValue, request, FuzzStats, pick, randomInt } = require("./fuzz-utils");
const { obtainToken } = require("./fuzz-auth");

async function runPurchasesFuzz(baseUrl, iterations) {
  const stats = new FuzzStats("purchases");
  const token = await obtainToken(baseUrl);
  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  for (let i = 0; i < iterations; i += 1) {
    const label = `iter-${i}`;
    const id = pick([fuzzScalar(), randomInt(-5, 999999), "1", "999999999"]);

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: "/api/purchases/submit",
        headers: auth,
        body: fuzzObject(),
      }),
      { expectStatuses: token ? [400, 201] : [401], label: `${label} submit` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: "/api/purchases/",
        headers: auth,
        body: fuzzObject(),
      }),
      { expectStatuses: token ? [400, 201] : [401], label: `${label} create` }
    );

    stats.record(
      await request(baseUrl, {
        method: "PATCH",
        path: `/api/purchases/${id}/status`,
        headers: auth,
        body: { status: fuzzScalar() },
      }),
      { expectStatuses: token ? [400, 403, 404] : [401], label: `${label} patch status` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: `/api/purchases/${id}/join`,
        headers: auth,
        body: fuzzObject(),
      }),
      { expectStatuses: token ? [400, 404] : [401], label: `${label} join` }
    );

    stats.record(
      await request(baseUrl, {
        method: "DELETE",
        path: `/api/purchases/${id}/join`,
        headers: auth,
      }),
      { expectStatuses: token ? [200, 400, 404] : [401], label: `${label} leave` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: `/api/purchases/${id}/reviews`,
        headers: auth,
        body: { rating: fuzzScalar(), comment: fuzzScalar() },
      }),
      { expectStatuses: token ? [400, 403, 404, 201] : [401], label: `${label} review` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: `/api/purchases/${id}/discussion`,
        headers: auth,
        body: { body: fuzzScalar() },
      }),
      { expectStatuses: token ? [400, 404, 201] : [401], label: `${label} discussion post` }
    );

    stats.record(
      await request(baseUrl, {
        method: "GET",
        path: `/api/purchases/mine?x=${fuzzQueryValue()}`,
        headers: auth,
      }),
      { expectStatuses: token ? [200] : [401], label: `${label} mine` }
    );
  }

  return stats;
}

module.exports = { runPurchasesFuzz };
