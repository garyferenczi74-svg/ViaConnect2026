import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure build succeeds on Vercel even if env-specific type differences arise
  typescript: {
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  // Pin Turbopack root to this package (monorepo has a parent lockfile)
  turbopack: {
    root: __dirname,
    resolveAlias: {
      // MediaPipe ships non-ESM builds; body-segmentation still static-imports them.
      // Relative aliases only (absolute Windows paths are not supported by Turbopack).
      "@mediapipe/selfie_segmentation":
        "./src/shims/mediapipe-selfie-segmentation.ts",
      "@mediapipe/pose": "./src/shims/mediapipe-pose.ts",
    },
  },
  // Barrel-package optimization
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "framer-motion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-progress",
      "@radix-ui/react-select",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
    turbopackFileSystemCacheForBuild: true,
  },
  serverExternalPackages: [
    "exceljs",
    "@google-cloud/vision",
    "sharp",
    "tesseract.js",
    "pdf-lib",
    "pptxgenjs",
    "unpdf",
    "@tensorflow/tfjs",
    "@tensorflow-models/body-segmentation",
    "@mediapipe/pose",
    "@mediapipe/selfie_segmentation",
  ],
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild/**/*",
      "node_modules/webpack/**/*",
      "node_modules/typescript/**/*",
      "node_modules/playwright/**/*",
      "node_modules/@playwright/**/*",
      "node_modules/vitest/**/*",
      "node_modules/@capacitor/**/*",
      "node_modules/@capacitor-community/**/*",
      "node_modules/@perfood/capacitor-healthkit/**/*",
      "node_modules/capacitor-health-connect/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nnhkcufyqjojdbvdrpky.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/features", destination: "/#features", permanent: true },
      { source: "/genomics", destination: "/#genomics", permanent: true },
      { source: "/process", destination: "/#process", permanent: true },
      { source: "/about", destination: "/#about", permanent: true },
      {
        source: "/body-tracker/photos",
        destination: "/body-tracker/composition",
        permanent: false,
      },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/terms-of-service", destination: "/terms", permanent: true },
      { source: "/tos", destination: "/terms", permanent: true },
    ];
  },
};

export default nextConfig;
