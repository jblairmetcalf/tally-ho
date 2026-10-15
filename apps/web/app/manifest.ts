import type { MetadataRoute } from 'next'

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
    background_color: INK,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
