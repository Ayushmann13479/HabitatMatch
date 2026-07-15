/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external sources
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
