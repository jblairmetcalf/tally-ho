import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  transpilePackages: ['@tally/app', '@tally/core', '@tally/ui'],
  devIndicators: false,
  images: { unoptimized: true },
}

export default config
