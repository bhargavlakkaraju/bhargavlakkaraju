// Public site URL for canonical links, sitemap, embeds and share images. An explicit
// NEXT_PUBLIC_SITE_URL wins; on Vercel fall back to the production domain, or the stable
// branch alias for preview deployments.
function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const host =
    process.env.VERCEL_ENV === 'production'
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : 'http://localhost:3000';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { SITE_URL_RESOLVED: resolveSiteUrl() },
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Everything except /embed/* may only be framed by ourselves.
        source: '/((?!embed/).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/(covers|og|fonts)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ];
  },
  async redirects() {
    return [{ source: '/game/:slug', destination: '/games/:slug', permanent: true }];
  },
};

export default nextConfig;
