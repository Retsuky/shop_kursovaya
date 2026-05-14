/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/purchases", destination: "/catalog", permanent: false }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "3020", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "3020", pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;
