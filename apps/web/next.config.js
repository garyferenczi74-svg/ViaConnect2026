/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@genex360/ui', '@genex360/core', '@genex360/api-client'],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' blob: data: https:",
            "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://api.deepseek.com https://api.perplexity.ai https://api.stripe.com",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
  ],
};

module.exports = nextConfig;
