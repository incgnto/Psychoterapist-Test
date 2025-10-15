/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is stable in Next.js 14
  reactStrictMode: true,
  images: {
    // Add remote patterns if you ever load remote images in messages
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig