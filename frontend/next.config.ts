import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for mapbox-gl to work properly
  transpilePackages: ['mapbox-gl'],
};

export default nextConfig;
