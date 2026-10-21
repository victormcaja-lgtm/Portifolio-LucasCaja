import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Somente as imagens de demonstração (Picsum). O host fastly.picsum.photos recebe os redirecionamentos.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/id/**", search: "?grayscale" },
      { protocol: "https", hostname: "fastly.picsum.photos", pathname: "/id/**" },
    ],
  },
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
