/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(mid|midi)$/,
      use: {
        loader: 'url-loader',
      },
    });
    return config;
  },
}

module.exports = nextConfig
