#!/usr/bin/env node
/**
 * PostToolUse formatter: after an Edit/Write, run Biome on that one file so formatting never
 * drifts. Never blocks (lint problems are the gate's job, and a half-finished edit, like an
 * import about to be used, shouldn't be "fixed" mid-change). Biome's own includes decide what
 * it touches (docs/imports, CSS and generated output are excluded in biome.json).
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

try {
  const input = JSON.parse((await new Response(process.stdin).text()) || '{}')
  const target = input.tool_input?.file_path
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: set by Claude Code for every hook
  const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd()
  if (!target) process.exit(0)
  const file = resolve(root, target)
  if (relative(root, file).startsWith('..')) process.exit(0)
  if (!['.ts', '.tsx', '.mts', '.mjs', '.js', '.json'].includes(extname(file))) process.exit(0)
  const biome = join(root, 'node_modules', '.bin', 'biome')
  if (!existsSync(file) || !existsSync(biome)) process.exit(0)
  spawnSync(biome, ['format', '--write', '--no-errors-on-unmatched', file], {
    cwd: root,
    stdio: 'ignore',
    timeout: 15_000,
  })
} catch {
  /* formatting is a courtesy: never fail the edit */
}
process.exit(0)
