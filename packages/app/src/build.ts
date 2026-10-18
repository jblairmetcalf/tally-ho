/** The build stamp from apps/web/next.config.ts ("a1b2c3d · 2026-10-18"), or null (Storybook, tests). */
export function buildStamp(): string | null {
  try {
    return process.env.NEXT_PUBLIC_BUILD || null
  } catch {
    return null // no `process` in this runtime
  }
}
