/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3003",
        "4zgz45gp-3003.asse.devtunnels.ms",
        "*.asse.devtunnels.ms"
      ]
    }
  }
};

module.exports = nextConfig;
