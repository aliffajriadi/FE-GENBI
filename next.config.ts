import type { NextConfig } from "next";

// Browser cukup bicara ke port 3000; Next meneruskan API, file & Socket.IO ke backend.
const BACKEND = process.env.BACKEND_URL || "http://localhost:4000";

const config: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true, // Socket.IO memakai /socket.io/?EIO=… (garis miring di akhir)
  rewrites: async () => ["/api/v1/:path*", "/storage/:path*", "/socket.io/"].map((source) => ({ source, destination: BACKEND + source })),
};
export default config;
