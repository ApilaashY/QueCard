import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["local-origin.dev", "*.local-origin.dev", "[IP_ADDRESS]"],
  output: 'standalone',
};

export default nextConfig;
