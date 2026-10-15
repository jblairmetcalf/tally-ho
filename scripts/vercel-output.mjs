/**
 * Package a static build for `vercel deploy --prebuilt` (Vercel's Build Output API v3).
 * Copies <buildDir> to <projectDir>/.vercel/output/static, beside the project link that
 * `vercel link` keeps in <projectDir>/.vercel — so the link survives rebuilds, nothing is
 * built on Vercel's side, and the deploy is exactly what was tested locally.
 *
 * Usage: node scripts/vercel-output.mjs <buildDir> <projectDir>
 */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const [buildDir, projectDir] = process.argv.slice(2).map((p) => resolve(p))
if (!buildDir || !projectDir) throw new Error('usage: vercel-output.mjs <buildDir> <projectDir>')

const output = join(projectDir, '.vercel', 'output')
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(buildDir, join(output, 'static'), { recursive: true })
await writeFile(
  join(output, 'config.json'),
  `${JSON.stringify(
    {
      version: 3,
      routes: [
        // The service worker must never be cached, or an installed app can't see an update.
        {
          src: '/sw.js',
          headers: { 'cache-control': 'public, max-age=0, must-revalidate' },
          continue: true,
        },
        { handle: 'filesystem' },
        { src: '/(.*)', status: 404, dest: '/404.html' },
      ],
    },
    null,
    2,
  )}\n`,
)
console.log(`vercel-output: ${buildDir} → ${output}`)
