import { execSync } from 'node:child_process'
import type { NextConfig } from 'next'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

/**
 * Which build is this? The commit (with "+" when the tree had uncommitted changes) and the
 * day it was built, shown at the bottom of Settings so any phone can say what it's running.
 */
function buildStamp(): string {
  const git = (args: string) => {
    try {
      return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim()
    } catch {
      return ''
    }
  }
  const sha = git('rev-parse --short HEAD') || 'local'
  const dirty = git('status --porcelain') ? '+' : ''
  return `${sha}${dirty} · ${new Date().toISOString().slice(0, 10)}`
}

export default function config(phase: string): NextConfig {
  return {
    output: 'export',
    env: { NEXT_PUBLIC_BUILD: buildStamp() },
    // With `output: 'export'`, distDir is where the static export lands (Next keeps its own
    // build files in .next). TALLY_DIST_DIR lets the emulator e2e build into its own folder
    // (out-cloud) without touching the real one. Build only: `next dev` keeps using .next.
    ...(phase === PHASE_PRODUCTION_BUILD ? { distDir: process.env.TALLY_DIST_DIR || 'out' } : {}),
    transpilePackages: ['@tally/app', '@tally/core', '@tally/ui'],
    devIndicators: false,
    images: { unoptimized: true },
  }
}
