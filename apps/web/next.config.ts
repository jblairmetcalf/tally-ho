import type { NextConfig } from 'next'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

export default function config(phase: string): NextConfig {
  return {
    output: 'export',
    // With `output: 'export'`, distDir is where the static export lands (Next keeps its own
    // build files in .next). TALLY_DIST_DIR lets the emulator e2e build into its own folder
    // (out-cloud) without touching the real one. Build only: `next dev` keeps using .next.
    ...(phase === PHASE_PRODUCTION_BUILD ? { distDir: process.env.TALLY_DIST_DIR || 'out' } : {}),
    transpilePackages: ['@tally/app', '@tally/core', '@tally/ui'],
    devIndicators: false,
    images: { unoptimized: true },
  }
}
