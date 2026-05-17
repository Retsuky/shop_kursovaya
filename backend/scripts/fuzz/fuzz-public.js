const {
  fuzzScalar,
  fuzzObject,
  fuzzQueryValue,
  request,
  FuzzStats,
  randomInt,
  pick,
} = require("./fuzz-utils");

async function runPublicFuzz(baseUrl, iterations) {
  const stats = new FuzzStats("public");

  for (let i = 0; i < iterations; i += 1) {
    const label = `iter-${i}`;

    stats.record(
      await request(baseUrl, { method: "GET", path: "/api/health" }),
      { expectStatuses: [200], label: `${label} health` }
    );

    const catalogQuery = [
      `limit=${fuzzQueryValue()}`,
      `offset=${fuzzQueryValue()}`,
      `deal=${fuzzQueryValue()}`,
      `sort=${fuzzQueryValue()}`,
      `max_price=${fuzzQueryValue()}`,
      `categories=${fuzzQueryValue()}`,
    ].join("&");

    stats.record(
      await request(baseUrl, { method: "GET", path: `/api/purchases/catalog?${catalogQuery}` }),
      { expectStatuses: [200], label: `${label} catalog` }
    );

    stats.record(
      await request(baseUrl, { method: "GET", path: `/api/purchases/?status=${fuzzQueryValue()}` }),
      { label: `${label} purchases list` }
    );

    const id = pick([fuzzScalar(), randomInt(-100, 999999)]);
    stats.record(
      await request(baseUrl, { method: "GET", path: `/api/purchases/${id}` }),
      { expectStatuses: [200, 400, 404], label: `${label} purchase by id` }
    );

    stats.record(
      await request(baseUrl, { method: "GET", path: `/api/purchases/${id}/reviews` }),
      { expectStatuses: [200, 400, 404], label: `${label} reviews` }
    );

    stats.record(
      await request(baseUrl, { method: "GET", path: `/api/purchases/${id}/discussion` }),
      { expectStatuses: [200, 400, 404], label: `${label} discussion` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: "/api/auth/register",
        body: fuzzObject(),
      }),
      { expectStatuses: [400, 409, 201], label: `${label} register garbage` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: "/api/auth/login",
        body: fuzzObject(),
      }),
      { expectStatuses: [400, 401], label: `${label} login garbage` }
    );

    stats.record(
      await request(baseUrl, {
        method: "POST",
        path: "/api/auth/login",
        body: '{"email":',
      }),
      { expectStatuses: [400, 500], label: `${label} login broken json` }
    );

    stats.record(
      await request(baseUrl, {
        method: "GET",
        path: `/api/purchases/checkout-requisites?ids=${fuzzQueryValue()}`,
      }),
      { expectStatuses: [200, 400], label: `${label} checkout-requisites` }
    );
  }

  return stats;
}

module.exports = { runPublicFuzz };
