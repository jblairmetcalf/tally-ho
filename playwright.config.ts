import { defineConfig, devices } from '@playwright/test'

/**
 * Two suites, each against a static build served by scripts/serve.mjs:
 *   web        the exported app (apps/web/out) on an iPhone 14 viewport. Fresh localStorage per test.
 *   storybook  every story (apps/storybook/storybook-static): renders cleanly + axe, both themes.
 * Ports 3101/3103 so a running `pnpm dev` (:3100) or `pnpm storybook` is never mistaken for a build.
 */
const WEB = 3101
const STORYBOOK = 3103

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  retries: process.env.CI ? 1 : 0,
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'web',
      outputDir: 'test-results/web',
      testIgnore: /storybook\.spec\.ts$/,
      use: {
        ...devices['iPhone 14'],
        defaultBrowserType: 'chromium',
        baseURL: `http://localhost:${WEB}`,
      },
    },
    {
      name: 'storybook',
      outputDir: 'test-results/storybook',
      testMatch: /storybook\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1000, height: 900 },
        reducedMotion: 'reduce',
        baseURL: `http://localhost:${STORYBOOK}`,
      },
    },
  ],
  webServer: [
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
