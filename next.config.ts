import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = staticExport
  ? {
      // Plain files for static hosts (e.g. Netlify Drop): relative asset URLs, no server features.
      output: "export",
      distDir: "out",
      assetPrefix: "./",
      images: { unoptimized: true },
    }
  : {
      allowedDevOrigins: ["127.0.0.1", "localhost"],
      async headers() {
        return [
          {
            source: "/",
            headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
          },
        ];
      },
    };

export default nextConfig;
