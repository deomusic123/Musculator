import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@musculator/contracts", "@musculator/domain"],
};

export default nextConfig;
