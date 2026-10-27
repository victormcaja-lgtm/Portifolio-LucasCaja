import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // TASK-05: habilita forbidden() (403) em requireRole (src/server/authz.ts), com a UI de
    // src/app/admin/forbidden.tsx. Docs: 04-functions/forbidden.md e
    // 05-config/01-next-config-js/authInterrupts.md.
    authInterrupts: true,
  },
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
