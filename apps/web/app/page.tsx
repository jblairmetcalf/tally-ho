'use client'

import dynamic from 'next/dynamic'

// The app reads localStorage on start, so it only ever renders in the browser. The static
// export ships an empty shell painted in the page colour; the app mounts on load.
const TallyApp = dynamic(() => import('@tally/app').then((m) => m.TallyApp), { ssr: false })

export default function Page() {
  return <TallyApp />
}
