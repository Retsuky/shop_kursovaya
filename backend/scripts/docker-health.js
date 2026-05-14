const http = require("http");
const port = Number(process.env.PORT) || 3020;

const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
  res.resume();
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on("error", () => process.exit(1));
req.setTimeout(3000, () => {
  req.destroy();
  process.exit(1);
});
