/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Enable image optimization for local images
    unoptimized: false,
    // Supported device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for the optimizer
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 1024, 2048],
    // Formats to use (modern browsers get avif/webp, fallback to original)
    formats: ['image/avif', 'image/webp'],
    // Increase minimum cache TTL (24 hours in seconds)
    minimumCacheTTL: 86400,
  },
}

module.exports = nextConfig





