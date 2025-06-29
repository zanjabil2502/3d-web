/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export output for GitHub Pages deployment
  output: 'export',

  // Enable experimental features jika diperlukan
  experimental: {
    // outputFileTracingRoot: path.join(__dirname, '../../'),
  },

  // Base path and asset prefix for GitHub Pages deployment
  basePath: '/3d-web',
  assetPrefix: '/3d-web/',
  trailingSlash: true, // Important for static export on GitHub Pages

  // Disable ESLint during builds to avoid build errors on GitHub Actions
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
