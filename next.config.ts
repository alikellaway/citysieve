import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-libsql', '@libsql/client'],
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
