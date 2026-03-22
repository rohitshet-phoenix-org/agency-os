import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agency-os/db"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
