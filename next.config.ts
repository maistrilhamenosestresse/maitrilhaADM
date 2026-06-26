import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/bio',
        destination: '/bio/index.html',
      },
    ];
  },
};

export default nextConfig;
