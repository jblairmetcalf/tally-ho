import type { MetadataRoute } from 'next'
import { SPLASH_BG } from './splash'

export const dynamic = 'force-static'

/** The dark theme's page colour, so the splash screen and the first paint match. */
const INK = '#13112E'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Tally Ho!',
    short_name: 'Tally Ho!',
    description: 'The family scoreboard for card and board games.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: INK,
    // Android's launch screen: the splash's own ground, so the hand-off to it has no seam.
    background_color: SPLASH_BG,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
