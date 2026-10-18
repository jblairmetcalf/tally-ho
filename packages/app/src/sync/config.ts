export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

/** The project the emulators run as (`demo-*` projects never touch production). */
const EMULATOR_PROJECT = 'demo-tally'
export const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099'
export const FIRESTORE_EMULATOR = { host: '127.0.0.1', port: 8080 } as const

const DEMO_CONFIG: FirebaseConfig = {
  apiKey: 'demo-key',
  authDomain: 'localhost',
  projectId: EMULATOR_PROJECT,
  appId: 'demo',
}

/** `NEXT_PUBLIC_FIREBASE_EMULATOR=1`: talk to the local Auth and Firestore emulators. */
export function emulatorEnabled(): boolean {
  try {
    return process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === '1'
  } catch {
    return false // no `process` in this runtime (Storybook)
  }
}

/**
 * This build's Firebase project, from `NEXT_PUBLIC_FIREBASE_*`, or null when it has none
 * (then the app is demo-only and hides sign-in). With the emulator flag the keys may be
 * absent, and the project is always `demo-tally` so tests never reach a real project.
 */
export function firebaseConfig(): FirebaseConfig | null {
  // Each name is spelled out so Next inlines it into the browser bundle.
  let env: Partial<FirebaseConfig>
  try {
    env = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  } catch {
    env = {}
  }
  const { apiKey, authDomain, projectId, appId } = env
  const full = apiKey && authDomain && projectId && appId
  if (emulatorEnabled())
    return full ? { apiKey, authDomain, projectId: EMULATOR_PROJECT, appId } : DEMO_CONFIG
  return full ? { apiKey, authDomain, projectId, appId } : null
}
