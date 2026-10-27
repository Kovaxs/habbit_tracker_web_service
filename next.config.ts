import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.5.184"],
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: { bodySizeLimit: "3mb" }, // Includes multipart overhead for a 2 MB workbook.
  },
};

export default nextConfig;
