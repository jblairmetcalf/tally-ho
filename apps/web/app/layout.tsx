import type { Metadata, Viewport } from 'next'
import { Lilita_One, Nunito } from 'next/font/google'
import type { ReactNode } from 'react'
import { SPLASH, splashFile, splashMedia } from './splash'
import { SwRegister } from './sw-register'
import './globals.css'

const lilita = Lilita_One({ subsets: ['latin'], weight: '400', variable: '--font-lilita' })
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-nunito',
})

/** The dark theme's page colour: the splash, the first paint and the status bar agree. */
const INK = '#13112E'

/**
 * Runs before first paint: picks the saved theme (or the OS one) so a Daylight phone never
 * flashes the dark page while the app loads. Mirrors `useThemePref`, which takes over after.
 */
const THEME_BOOT = `(function(){try{var t='system';var r=localStorage.getItem('tallyho.v3');if(r){var p=JSON.parse(r).prefs;if(p&&p.theme)t=p.theme}if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m){m.removeAttribute('media');m.content=t==='light'?'#FFF4E2':'${INK}'}}catch(e){}})()`

export const metadata: Metadata = {
  title: 'Tally Ho!',
  description: 'The family scoreboard for card and board games.',
  applicationName: 'Tally Ho!',
  appleWebApp: {
    capable: true,
    title: 'Tally Ho!',
    statusBarStyle: 'black-translucent',
    startupImage: SPLASH.map((s) => ({ url: `/${splashFile(s)}`, media: splashMedia(s) })),
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '64x64' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: INK,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${lilita.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed inline boot script */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  )
}
