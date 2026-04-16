/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Exclude Hardhat build artifacts from the file watcher
      config.watchOptions = {
        ignored: /node_modules|artifacts|cache|contracts|scripts|test|deployments|ignition/,
      }
    }
    return config
  },
};

export default nextConfig;
