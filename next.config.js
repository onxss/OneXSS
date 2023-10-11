/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: { runtime: 'experimental-edge'},
  compress: true,
};


module.exports = nextConfig;
