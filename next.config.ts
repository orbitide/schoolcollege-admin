import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [
      { source: "/schools/:path*", destination: "/institutes/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
