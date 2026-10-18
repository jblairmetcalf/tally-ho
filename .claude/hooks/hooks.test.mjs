/**
 * Tests for the hooks, by piping real hook payloads into them: `node --test .claude/hooks`.
 * Run by `pnpm check:harness` (and so by CI).
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const ROOT = resolve(import.meta.dirname, '..', '..')
const run = (hook, payload) =>
  spawnSync('node', [join(ROOT, '.claude/hooks', hook)], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    encoding: 'utf8',
  })
const edit = (file_path, tool = 'Edit') =>
  run('guard.mjs', { tool_name: tool, tool_input: { file_path } })
const bash = (command) => run('guard.mjs', { tool_name: 'Bash', tool_input: { command } })

test('guard blocks protected files, with a reason', () => {
  for (const f of [
    'docs/imports/Tally Ho!.html',
    'pnpm-lock.yaml',
    'apps/web/out/index.html',
    'apps/storybook/storybook-static/index.html',
    'apps/web/.env.local',
    '.env',
    'apps/web/public/splash-1179x2556.png',
    'apps/web/public/favicon.svg',
    `${ROOT}/apps/web/.vercel/project.json`,
  ]) {
    const r = edit(f, 'Write')
    assert.equal(r.status, 2, `${f} should be blocked`)
    assert.match(r.stderr, /Blocked by \.claude\/hooks\/guard\.mjs/)
  }
})

test('guard allows ordinary source, docs and the env template', () => {
  for (const f of [
    'packages/ui/src/primitives/Button.tsx',
    'apps/web/.env.example',
    'docs/DESIGN.md',
    'apps/web/public/sw.js',
    'CLAUDE.md',
    '/Users/someone/elsewhere/notes.md',
  ])
    assert.equal(edit(f).status, 0, `${f} should be allowed`)
})

test("guard keeps publishing and destruction in the user's hands", () => {
  for (const c of [
    'git push',
    'git push origin main --force',
    'pnpm deploy',
    'pnpm run deploy:storybook',
    'npx --yes vercel deploy apps/web/out',
    'pnpm firebase:rules',
    'npx firebase-tools deploy --only firestore:rules',
    'git reset --hard HEAD~1',
    'git commit -m x --no-verify',
    'rm -rf packages/ui',
    'rm -rf apps/web/out packages',
  ])
    assert.equal(bash(c).status, 2, `${c} should be blocked`)
})

test('guard allows the everyday commands', () => {
  for (const c of [
    'pnpm lint && pnpm typecheck && pnpm test',
    'CI=true pnpm e2e',
    'git status && git diff --stat',
    'git add -A && git commit -m "Fix" ',
    'rm -rf apps/web/out apps/storybook/storybook-static',
    'node scripts/vercel-output.mjs apps/web/out apps/web',
    'rm -f stray.log',
  ])
    assert.equal(bash(c).status, 0, `${c} should be allowed`)
})

test('format rewrites an edited file to Biome style and never fails', () => {
  const dir = mkdtempSync(join(ROOT, 'packages/core/src/.hooktest-'))
  try {
    const f = join(dir, 'ugly.ts')
    writeFileSync(f, 'export const  x={a:1,b:"two"};\n')
    const r = run('format.mjs', { tool_name: 'Write', tool_input: { file_path: f } })
    assert.equal(r.status, 0)
    assert.equal(readFileSync(f, 'utf8'), "export const x = { a: 1, b: 'two' }\n")
    // Not a formattable file, or a missing one: still exit 0.
    assert.equal(run('format.mjs', { tool_input: { file_path: join(dir, 'nope.css') } }).status, 0)
    assert.equal(run('format.mjs', {}).status, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('guard judges commands, not text that mentions them', () => {
  // Content being written, searched for or matched is not a command.
  for (const c of [
    "cat > docs/X.md <<'EOF'\nThen run git push and pnpm deploy.\nEOF",
    'grep -n "\\.vercel" README.md',
    "python3 - <<'EOF'\nGENERATED = r'(\\.vercel|out)'\nEOF",
    'echo "never git push from here"',
    // An alternation inside a quoted pattern is not a pipe into a new command.
    'grep -n -i "pnpm\\|port\\|vercel\\|deploy" CONVENTIONS.md',
    "rg 'push|vercel deploy' docs",
  ])
    assert.equal(bash(c).status, 0, `${c} should be allowed`)
  // ...but a real command after one, or behind npx, still is.
  for (const c of [
    'pnpm lint && git push',
    'npx vercel login',
    'cd x; pnpm exec vercel deploy',
    'FOO=1 git push',
    // A command hidden in a shell string is still a command.
    'bash -c "git push"',
    "sh -c 'pnpm lint | vercel deploy'",
    'eval "pnpm deploy"',
  ])
    assert.equal(bash(c).status, 2, `${c} should be blocked`)
})
