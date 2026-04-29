/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/purchases", destination: "/catalog", permanent: false }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "api.dicebear.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
