/** @type {import('next').NextConfig} */

function uploadRemotePatterns() {
  const patterns = [
    { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    { protocol: "http", hostname: "localhost", port: "3020", pathname: "/uploads/**" },
    { protocol: "http", hostname: "127.0.0.1", port: "3020", pathname: "/uploads/**" },
  ];

  const api = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (api) {
    try {
      const base = api.replace(/\/api\/?$/i, "");
      const u = new URL(base || api);
      const entry = {
        protocol: u.protocol.replace(":", ""),
        hostname: u.hostname,
        pathname: "/uploads/**",
      };
      if (u.port) {
        entry.port = u.port;
      }
      patterns.push(entry);
    } catch {
      /* ignore */
    }
  }

  return patterns;
}

const nextConfig = {
  async redirects() {
    return [{ source: "/purchases", destination: "/catalog", permanent: false }];
  },
  images: {
    remotePatterns: uploadRemotePatterns(),
  },
};

export default nextConfig;
