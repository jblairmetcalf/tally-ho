/**
 * Keeps the agent harness honest: the instructions agents read must point at things that exist.
 *
 *   · every link and repo path named in CLAUDE.md, AGENTS.md, CONVENTIONS.md, README.md, docs/*.md
 *     and .claude/** exists (paths in `code`, markdown links, and @imports)
 *   · every `pnpm <script>` they mention is a real root script
 *   · every skill (.claude/skills/<name>/SKILL.md) and agent (.claude/agents/*.md) has frontmatter
 *     with a matching `name` and a `description`
 *   · every path rule (.claude/rules/*.md) has `paths:` globs, and each matches at least one file
 *
 * Usage: node scripts/check-harness.mjs   (part of `pnpm check:harness`, run in CI)
 */
import { existsSync, globSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const problems = []
const fail = (file, msg) => problems.push(`${relative(ROOT, file)}: ${msg}`)

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'out',
  'out-cloud',
  'storybook-static',
  '.next',
  '.turbo',
  'test-results',
  'imports',
])
function walk(dir, keep) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return IGNORE_DIRS.has(n) ? [] : walk(p, keep)
    return keep(p) ? [p] : []
  })
}

const docs = [
  ...['CLAUDE.md', 'AGENTS.md', 'CONVENTIONS.md', 'README.md'].map((f) => join(ROOT, f)),
  ...walk(join(ROOT, 'docs'), (p) => p.endsWith('.md')),
  ...walk(join(ROOT, '.claude'), (p) => p.endsWith('.md')),
].filter((f) => existsSync(f))

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const SCRIPTS = new Set(Object.keys(pkg.scripts ?? {}))
/** pnpm's own commands, not package scripts. */
const PNPM_BUILTINS = new Set([
  'install',
  'i',
  'add',
  'remove',
  'rm',
  'exec',
  'dlx',
  'run',
  'why',
  'update',
  'up',
  'approve-builds',
  'list',
  'ls',
  'outdated',
  'store',
  'env',
  'create',
  'init',
  'link',
])

/** Things in backticks that look like repo paths (not placeholders, globs or prose). */
const PATH_HEAD =
  /^(\.?\/)?(packages|apps|scripts|e2e|docs|\.claude|\.github)\/|^(CLAUDE|AGENTS|CONVENTIONS|README)\.md$|^(firestore\.rules|firebase\.json|\.firebaserc|biome\.json|turbo\.json|playwright\.config\.ts|pnpm-workspace\.yaml|tsconfig\.base\.json|package\.json)$/
const isPlaceholder = (s) => /[<>*{}…$|]|\.\.\.|\s/.test(s)

/** Named on purpose but made later (by a CLI, a build or the user): fine to be missing. */
const GENERATED =
  /(^|\/)(\.vercel|\.env\.local|out|out-cloud|storybook-static|test-results|\.next)(\/|$)/

function checkPath(file, raw, base) {
  const p = raw
    .replace(/#.*$/, '')
    .replace(/:\d+(-\d+)?$/, '')
    .replace(/\/$/, '')
  if (!p || isPlaceholder(p) || GENERATED.test(p)) return
  const abs = resolve(base, p)
  if (!existsSync(abs)) fail(file, `names \`${raw}\`, which doesn't exist`)
}

const frontmatter = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const out = {}
  let key = null
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) {
      key = kv[1]
      out[key] = kv[2] === '' ? [] : kv[2].replace(/^["']|["']$/g, '')
    } else if (key && /^\s+-\s+/.test(line) && Array.isArray(out[key]))
      out[key].push(line.replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, ''))
  }
  return out
}

for (const file of docs) {
  const text = readFileSync(file, 'utf8')
  const body = text.replace(/^---\n[\s\S]*?\n---/, '')

  // Markdown links, relative to the file.
  for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    const href = m[1]
    if (/^(https?:|mailto:|#)/.test(href)) continue
    checkPath(file, decodeURI(href), dirname(file))
  }
  // @imports (Claude memory), relative to the file.
  for (const m of body.matchAll(/^@(\S+)$/gm)) checkPath(file, m[1], dirname(file))
  // Repo paths in backticks, relative to the repo root.
  for (const m of body.matchAll(/`([^`\n]+)`/g)) {
    const s = m[1].trim()
    if (PATH_HEAD.test(s)) checkPath(file, s, ROOT)
  }
  // pnpm scripts, but only in code (inline and fenced): prose like "pnpm workspaces" is fine.
  const code = [
    ...body.matchAll(/```[\s\S]*?```/g),
    ...body.replace(/```[\s\S]*?```/g, '').matchAll(/`[^`\n]+`/g),
  ]
    .map((m) => m[0])
    .join('\n')
  for (const m of code.matchAll(/\bpnpm\s+(?:run\s+)?([a-z][\w:-]*)/g)) {
    const name = m[1]
    if (PNPM_BUILTINS.has(name) || name.startsWith('-')) continue
    if (!SCRIPTS.has(name))
      fail(file, `mentions \`pnpm ${name}\`, which isn't a script in package.json`)
  }
}

// Skills.
const skillsDir = join(ROOT, '.claude', 'skills')
if (existsSync(skillsDir))
  for (const name of readdirSync(skillsDir)) {
    const f = join(skillsDir, name, 'SKILL.md')
    if (!existsSync(f)) {
      fail(join(skillsDir, name), 'has no SKILL.md')
      continue
    }
    const fm = frontmatter(readFileSync(f, 'utf8'))
    if (!fm) fail(f, 'has no frontmatter')
    else {
      if (fm.name !== name) fail(f, `frontmatter name "${fm.name}" should be "${name}"`)
      if (!fm.description || fm.description.length < 20)
        fail(f, 'needs a description saying when to use it')
    }
  }

// Agents.
for (const f of walk(join(ROOT, '.claude', 'agents'), (p) => p.endsWith('.md'))) {
  const fm = frontmatter(readFileSync(f, 'utf8'))
  const name = f.split('/').pop().replace(/\.md$/, '')
  if (!fm) fail(f, 'has no frontmatter')
  else {
    if (fm.name !== name) fail(f, `frontmatter name "${fm.name}" should be "${name}"`)
    if (!fm.description || fm.description.length < 20)
      fail(f, 'needs a description saying when to use it')
  }
}

// Path rules: globs that match nothing load for nothing.
for (const f of walk(join(ROOT, '.claude', 'rules'), (p) => p.endsWith('.md'))) {
  const fm = frontmatter(readFileSync(f, 'utf8'))
  const globs = Array.isArray(fm?.paths) ? fm.paths : fm?.paths ? [fm.paths] : []
  if (!globs.length) fail(f, 'has no `paths:` globs in its frontmatter')
  for (const g of globs) {
    const hits = globSync(g, {
      cwd: ROOT,
      exclude: (p) => /(^|\/)(node_modules|out|storybook-static|\.next)(\/|$)/.test(p),
    })
    if (!hits.length) fail(f, `paths glob "${g}" matches no files`)
  }
}

if (problems.length) {
  console.error(`check-harness: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`)
  for (const p of problems) console.error(`  · ${p}`)
  process.exit(1)
}
console.log(`check-harness: ${docs.length} docs, skills, agents and rules check out`)
