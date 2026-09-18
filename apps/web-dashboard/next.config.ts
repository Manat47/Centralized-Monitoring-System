import type { NextConfig } from "next";

const apiGatewayInternalUrl =
  process.env.API_GATEWAY_INTERNAL_URL ?? "http://localhost:3005";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiGatewayInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
