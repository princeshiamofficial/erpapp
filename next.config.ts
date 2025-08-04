
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // WARNING: Setting `ignoreBuildErrors` to `true` allows your application to build
    // and run even if there are TypeScript errors. This can hide underlying issues
    // that may lead to runtime errors or unexpected behavior.
    // It's recommended to set this to `false` and fix TypeScript errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // WARNING: Setting `ignoreDuringBuilds` to `true` allows your application to build
    // even if there are ESLint errors or warnings. This can hide code quality issues.
    // It's recommended to set this to `false` and fix ESLint issues.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'colorhutbd.xyz',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(app)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
