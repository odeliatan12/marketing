/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
  // Allow agent requests up to 5 minutes (branding calls Claude twice)
  experimental: {
    proxyTimeout: 300000,
  },
};

module.exports = nextConfig;
