import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack for compatibility with tldraw and pdfjs-dist
  // Next.js 16 defaults to Turbopack, but these packages need webpack
  turbopack: {},

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iggwfzxtramxovfxsmky.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Webpack config for pdf.js compatibility
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },

  // Required for LiveKit server SDK
  serverExternalPackages: ["livekit-server-sdk"],
};

export default nextConfig;
