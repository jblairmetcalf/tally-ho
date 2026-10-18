#!/usr/bin/env node
/**
 * PreToolUse guard. Reads the hook payload on stdin; exit 2 (with the reason on stderr) blocks
 * the tool call and tells the agent why. Keeps agents off the reference prototype, generated
 * output, secrets and the lockfile, and keeps pushing / deploying in the user's hands.
 */
import { relative, resolve } from 'node:path'

const input = JSON.parse((await new Response(process.stdin).text()) || '{}')
const tool = input.tool_name ?? ''
const args = input.tool_input ?? {}
// biome-ignore lint/suspicious/noUndeclaredEnvVars: set by Claude Code for every hook
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd()

const block = (why) => {
  process.stderr.write(`Blocked by .claude/hooks/guard.mjs: ${why}\n`)
  process.exit(2)
}

/** Files agents must not edit, with what to do instead. */
const PROTECTED = [
  [/^docs\/imports\//, 'docs/imports is the original prototype and icon: a read-only reference.'],
  [
    /(^|\/)pnpm-lock\.yaml$/,
    'the lockfile is written by pnpm: run `pnpm add` / `pnpm install`, and say so.',
  ],
  [
    /(^|\/)(out|out-cloud|storybook-static|\.next|\.turbo|test-results|node_modules)\//,
    'that is generated output: change the source and rebuild.',
  ],
  [
    /(^|\/)\.vercel\//,
    '.vercel is the Vercel link and build output: managed by the CLI and scripts/vercel-output.mjs.',
  ],
  [
    /(^|\/)\.env(?!\.example$)[^/]*$/,
    ".env files hold the user's keys (and the Vercel token): ask the user to edit them.",
  ],
  [
    /^apps\/web\/public\/(icon-|maskable-|splash-|apple-touch-icon|favicon)/,
    'icons and splash screens are generated: run `pnpm icons` (scripts/icons.ts).',
  ],
]

const FILE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
if (FILE_TOOLS.has(tool)) {
  const target = args.file_path ?? args.notebook_path
  if (target) {
    const rel = relative(root, resolve(root, target)).split('\\').join('/')
    if (!rel.startsWith('..'))
      for (const [re, why] of PROTECTED) if (re.test(rel)) block(`${rel}: ${why}`)
  }
}

if (tool === 'Bash') {
  // Judge commands, not text: drop heredoc bodies (they're content being written), then look at
  // each command where one can start (line start, or after ; && || | $( ). A doc or regex that
  // merely mentions `git push` or `.vercel` must not be blocked.
  const cmd = String(args.command ?? '').replace(
    /<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g,
    '',
  )
  const commands = cmd
    .split(/\n|;|&&|\|\||\||\$\(|`/)
    .map((c) => c.trim().replace(/^(\w+=\S*\s+)*(sudo\s+|exec\s+|env\s+)?/, ''))
    .filter(Boolean)

  /** Commands that publish or destroy: the user runs these (CLAUDE.md, Autonomy). */
  const RULES = [
    [/^git\s+push\b.*(--force|\s-f\b)/, 'never force-push.'],
    [
      /^git\s+push\b/,
      "pushing is the user's call. Print the command for them instead (see the ship skill).",
    ],
    [
      /^pnpm\s+(run\s+)?deploy(:storybook)?\b/,
      "deploying is the user's call. Print `pnpm deploy` for them instead.",
    ],
    [
      /^((npx|pnpm\s+(exec|dlx))\s+(--yes\s+)?)?vercel\b/,
      "Vercel deploys and links are the user's call.",
    ],
    [
      /^((npx|pnpm\s+(exec|dlx))\s+(--yes\s+)?)?firebase(-tools)?\s+deploy\b|^pnpm\s+(run\s+)?firebase:rules\b/,
      "deploying Firestore rules is the user's call. Print `pnpm firebase:rules` for them.",
    ],
    [/^git\s+reset\s+--hard\b|^git\s+clean\s+-[a-z]*f/, 'that discards work. Ask the user first.'],
    [/^git\s+(commit|push)\b.*--no-verify\b/, "don't skip hooks."],
  ]
  for (const c of commands) for (const [re, why] of RULES) if (re.test(c)) block(why)

  // rm -r only on build output.
  const SAFE_RM =
    /^(\.\/)?(apps\/web\/out(-cloud)?|apps\/storybook\/storybook-static|test-results|playwright-report|\.turbo|apps\/web\/\.next|\/private\/tmp\/claude-[^ ]*|\/tmp\/claude-[^ ]*)\/?$/
  for (const c of commands) {
    const m = c.match(/^rm\s+((?:-[a-zA-Z]*\s+)*)(.*)$/)
    if (!m || !/r/i.test(m[1] ?? '')) continue
    const unsafe = (m[2] ?? '')
      .trim()
      .split(/\s+/)
      .filter((t) => t && !SAFE_RM.test(t))
    if (unsafe.length)
      block(
        `recursive delete of ${unsafe.join(' ')}: only build output may be removed this way. Ask the user.`,
      )
  }
}

process.exit(0)
