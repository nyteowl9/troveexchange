/** @type {import('next').NextConfig} */
const nextConfig = {
  watchOptions: {
    // Exclude Hardhat build artifacts and other non-app folders from the file watcher
    // so the dev server doesn't spin up fans scanning thousands of JSON files
    ignored: ['**/artifacts/**', '**/cache/**', '**/contracts/**', '**/scripts/**', '**/test/**', '**/deployments/**', '**/ignition/**', '**/node_modules/**'],
  },
};

export default nextConfig;
