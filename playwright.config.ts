import { defineConfig, devices } from '@playwright/test'

/**
 * Suites, each against a static build served by scripts/serve.mjs:
 *   web        the exported app (apps/web/out) on an iPhone 14 viewport. Fresh localStorage per test.
 *   storybook  every story (apps/storybook/storybook-static): renders cleanly + axe, both themes.
 *   cloud      family sync (cloud.spec.ts) against the Firebase emulators. Only with CLOUD_E2E=1
 *              (`pnpm e2e:cloud`), and then it is the only suite: it builds the app with
 *              NEXT_PUBLIC_FIREBASE_EMULATOR=1 into apps/web/out-cloud, and two `next build`s at
 *              once would share apps/web/.next.
 * Ports 3101/3103/3105 so a running `pnpm dev` (:3100) or `pnpm storybook` is never mistaken for a build.
 */
const WEB = 3101
const STORYBOOK = 3103
const CLOUD = 3105
// biome-ignore lint/suspicious/noUndeclaredEnvVars: a Playwright switch, not a turbo task input
const cloud = process.env.CLOUD_E2E === '1'

const iphone = { ...devices['iPhone 14'], defaultBrowserType: 'chromium' as const }

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  retries: process.env.CI ? 1 : 0,
  use: { trace: 'retain-on-failure' },
  globalSetup: cloud ? './e2e/cloud-helpers.ts' : undefined,
  projects: cloud
    ? [
        {
          name: 'cloud',
          outputDir: 'test-results/cloud',
          testMatch: /cloud\.spec\.ts$/,
          // One shared emulator: the tests reset it, so they run one at a time, in order.
          fullyParallel: false,
          use: { ...iphone, baseURL: `http://localhost:${CLOUD}` },
        },
      ]
    : [
        {
          name: 'web',
          outputDir: 'test-results/web',
          testIgnore: [/storybook(-manager)?\.spec\.ts$/, /cloud\.spec\.ts$/],
          use: { ...iphone, baseURL: `http://localhost:${WEB}` },
        },
        {
          name: 'storybook',
          outputDir: 'test-results/storybook',
          testMatch: /storybook(-manager)?\.spec\.ts$/,
          use: {
            ...devices['Desktop Chrome'],
            viewport: { width: 1000, height: 900 },
            reducedMotion: 'reduce',
            baseURL: `http://localhost:${STORYBOOK}`,
          },
        },
      ],
  workers: cloud ? 1 : undefined,
  webServer: cloud
    ? [
        {
          command: `pnpm --filter @tally/web build && node scripts/serve.mjs apps/web/out-cloud ${CLOUD}`,
          url: `http://localhost:${CLOUD}`,
          // Always a fresh emulator build: never reuse a server that might be the real app.
          reuseExistingServer: false,
          timeout: 240_000,
          env: {
            TALLY_DIST_DIR: 'out-cloud',
            NEXT_PUBLIC_FIREBASE_EMULATOR: '1',
            NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key',
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-tally.firebaseapp.com',
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-tally',
            NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app',
          },
        },
      ]
    : [
        {
          command: `pnpm --filter @tally/web build && node scripts/serve.mjs apps/web/out ${WEB}`,
          url: `http://localhost:${WEB}`,
          reuseExistingServer: !process.env.CI,
          timeout: 240_000,
        },
        {
          // Built by `pnpm e2e` first: storybook.spec.ts lists stories from its index.json.
          command: `node scripts/serve.mjs apps/storybook/storybook-static ${STORYBOOK}`,
          url: `http://localhost:${STORYBOOK}/iframe.html`,
          reuseExistingServer: !process.env.CI,
          timeout: 240_000,
        },
      ],
})
