/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // This will ignore ESLint errors during production builds
  },
}

module.exports = nextConfig 