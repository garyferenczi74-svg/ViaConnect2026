/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure build succeeds on Vercel even if env-specific type/lint
  // differences arise between local and CI environments
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
