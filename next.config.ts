import type { NextConfig } from "next";

// Cache Components is intentionally off: with it on, Next.js keeps visited
// pages alive (hidden) via <Activity>, which would freeze a game mid-level
// and restore it later. Games should start fresh every time a level opens.
const nextConfig: NextConfig = {
  // Hide the on-screen Next.js dev badge (errors still show when they happen).
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
