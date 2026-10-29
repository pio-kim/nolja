import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Lodging photos from Google Hotels (via SerpApi) are served from these hosts.
    remotePatterns: [{ protocol: "https", hostname: "**.googleusercontent.com" }],
  },
};

export default nextConfig;
