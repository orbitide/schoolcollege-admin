import type { NextConfig } from "next";

// The SchoolCollege .NET API (SchoolCollege/src/Api, http profile).
const apiUrl = process.env.API_URL ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  redirects() {
    return [
      { source: "/schools/:path*", destination: "/institutes/:path*", permanent: true },
    ];
  },
  // The admin calls the API as /api/v1/... on its own origin (lib/http-client.ts),
  // so the sign-in cookie is first-party and no CORS is needed.
  rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
