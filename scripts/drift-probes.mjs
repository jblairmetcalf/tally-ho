/**
 * Drift probes: read-only, mechanical checks that turn the harness's rules into facts about the
 * code, for the `drift-and-align` skill. Prints a markdown report; exits 0 always (it's evidence,
 * not a gate — `pnpm check:harness` and the test suites are the gates).
 *
 * Each probe names the rule it checks (CONVENTIONS.md / .claude/rules/*.md) so a finding can be
 * classified: the code drifted (fix the code) or the rule drifted (fix the harness).
 *
 * Usage: node scripts/drift-probes.mjs [--json]
 */
import { existsSync, globSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const SKIP =
  /(^|\/)(node_modules|out|out-cloud|storybook-static|\.next|\.turbo|test-results|imports)(\/|$)/
const rel = (p) => relative(ROOT, p)
const read = (p) => readFileSync(p, 'utf8')

function walk(dir, keep) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (SKIP.test(rel(p))) return []
    return statSync(p).isDirectory() ? walk(p, keep) : keep(p) ? [p] : []
  })
}
const isSrc = (p) => /\.(ts|tsx)$/.test(p)
const isStory = (p) => p.includes('.stories.')
const isTest = (p) => /\.test\.tsx?$/.test(p) || rel(p).startsWith('e2e/')

const all = [
  ...walk(join(ROOT, 'packages'), isSrc),
  ...walk(join(ROOT, 'apps'), isSrc),
  ...walk(join(ROOT, 'e2e'), isSrc),
]
const text = Object.fromEntries(all.map((f) => [f, read(f)]))
const prod = all.filter((f) => !isStory(f) && !isTest(f))

/** A probe: the rule it checks, and findings as `file:line — detail`. */
const probes = []
const probe = (id, rule, findings) => probes.push({ id, rule, findings })
const linesMatching = (files, re, ok = () => false) =>
  files.flatMap((f) =>
    text[f]
      .split('\n')
      .map((l, i) => [l, i + 1])
      .filter(([l]) => re.test(l) && !ok(f, l))
      .map(([l, n]) => `${rel(f)}:${n} — ${l.trim().slice(0, 110)}`),
  )

// ── packages/ui ──
const uiSrc = prod.filter((f) => rel(f).startsWith('packages/ui/src/'))
const uiComponents = uiSrc.filter(
  (f) => f.endsWith('.tsx') && /export (function|const) [A-Z]/.test(text[f]),
)
// ThemeRoot draws nothing: it is the theme provider every story already renders inside.
const NO_STORY = /theme\/ThemeRoot\.tsx$/
probe(
  'ui-stories',
  'Every ui component has <Name>.stories.tsx beside it (CONVENTIONS 5, rules/ui.md)',
  uiComponents
    .filter((f) => !NO_STORY.test(f) && !existsSync(f.replace(/\.tsx$/, '.stories.tsx')))
    .map((f) => `${rel(f)} — no stories file`),
)
probe(
  'ui-barrels',
  'ui components are exported from their folder barrel (rules/ui.md)',
  uiComponents.flatMap((f) => {
    const barrel = join(dirname(f), 'index.ts')
    const mod = basename(f, '.tsx')
    return existsSync(barrel) && !read(barrel).includes(`'./${mod}'`)
      ? [`${rel(f)} — not in ${rel(barrel)}`]
      : []
  }),
)
// Brand art and canvas literals (rules/ui.md); THEME_COLOR feeds <meta name="theme-color">, which
// can't read a CSS variable (it mirrors THEME_BOOT in apps/web).
const BRAND = /brand\/(Fox|palette)|feel\/(confetti|suits)|theme\/ThemeRoot/
probe(
  'raw-colours',
  'Tokens, not raw colours; brand art is the only exception (CONVENTIONS 1)',
  linesMatching(
    prod.filter((f) => /packages\/(ui|app)\/src\/.*\.tsx$/.test(f)),
    /#[0-9a-fA-F]{3,8}\b|rgba?\(/,
    (f, l) => BRAND.test(f) || /^\s*(\/\/|\*)/.test(l) || /var\(--/.test(l),
  ),
)
probe(
  'ui-copy',
  'No user-facing copy hard-coded in ui components; strings live in packages/app/src/copy.ts (CONVENTIONS 7)',
  linesMatching(
    uiSrc.filter((f) => f.endsWith('.tsx')),
    />\s*[A-Z][a-z]+( [a-z]+){2,}[.!]?\s*</,
  ),
)

// ── packages/core ──
const core = prod.filter((f) => rel(f).startsWith('packages/core/src/'))
probe(
  'core-clock',
  'core never reads the wall clock: take a Clock (rules/core.md)',
  linesMatching(core, /\bDate\.now\(|new Date\(\)/, (f) => f.endsWith('schemas.ts')),
)
probe(
  'core-react',
  'core is pure: no React or DOM (rules/core.md)',
  linesMatching(core, /from ['"]react|\bwindow\.|\bdocument\./),
)

// ── boundaries ──
probe(
  'no-next-in-packages',
  'packages never import next/* (CONVENTIONS, Shape)',
  linesMatching(
    prod.filter((f) => rel(f).startsWith('packages/')),
    /from ['"]next\//,
  ),
)
probe(
  'firebase-lazy',
  'Firebase is only loaded by dynamic import() in sync/firebase.ts (rules/sync.md)',
  linesMatching(prod, /from ['"]firebase\/|require\(['"]firebase/, (_f, l) =>
    /^\s*import type /.test(l),
  ),
)
probe(
  'sounds-in-ui',
  "ui components don't play sounds; the store/screens do (VictoryOverlay's sting excepted) (rules/app.md)",
  linesMatching(
    uiSrc.filter((f) => !f.includes('/feel/')),
    /\bSFX\.\w+\(/,
    (f) => f.includes('VictoryOverlay'),
  ),
)
probe(
  'hard-deletes',
  'Never hard-delete a game or player (CONVENTIONS 6, rules/sync.md)',
  linesMatching(
    prod.filter((f) => rel(f).startsWith('packages/app/src/sync/')),
    /\bremove\(\s*['"](games|players)['"]|deleteDoc\(/,
    (f) => f.endsWith('firebase.ts'),
  ),
)

// ── dead weight ──
const copyFile = join(ROOT, 'packages/app/src/copy.ts')
const appUi = prod.filter((f) => /packages\/(app|ui)\/src\//.test(f) && f !== copyFile)
const deadCopy = []
{
  let path = []
  for (const line of read(copyFile).split('\n')) {
    const m = line.match(/^(\s*)(\w+): /)
    if (!m) continue
    const depth = m[1].length / 2
    path = [...path.slice(0, depth - 1), m[2]]
    const leaf = !line.trimEnd().endsWith('{')
    if (!leaf || /^(weekday|month|day|year)$/.test(m[2])) continue
    const key = m[2]
    // A map read by key (`S.names[k.id]`) uses every entry in it.
    const parent = path.at(-2)
    if (parent && appUi.some((f) => text[f].includes(`.${parent}[`))) continue
    // A top-level string is read as COPY.<key> (a bare `.key` would match any property).
    const read = path.length < 2 ? new RegExp(`COPY\\.${key}\\b`) : new RegExp(`\\.${key}\\b`)
    if (!appUi.some((f) => read.test(text[f])))
      deadCopy.push(`copy.ts — ${path.join('.')} is never read`)
  }
}
probe('dead-copy', 'Every string in copy.ts is used', deadCopy)

const css = read(join(ROOT, 'packages/ui/src/styles/components.css')).replace(/url\([^)]*\)/g, '')
const classes = [...new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]))]
const tsxAll = Object.entries(text)
  .filter(([f]) => /\.(tsx|ts)$/.test(f))
  .map(([, t]) => t)
  .join('\n')
// Built from a prop: `btn-${variant}` (Button), `tone-${tone}` (LinkRow).
const DYNAMIC = /^(btn-(jade|amber|ghost|coral)|tone-(jade|amber|fox|coral|lav))$/
probe(
  'dead-css',
  'Every class in components.css is used somewhere',
  classes
    .filter(
      (c) =>
        !DYNAMIC.test(c) &&
        !new RegExp(`(?<![\\w-])${c.replace(/[-]/g, '\\-')}(?![\\w-])`).test(tsxAll),
    )
    .map((c) => `components.css — .${c} is never used`),
)

const exportRe = /export (?:async )?(?:function|const|class) (\w+)/g
probe(
  'unused-exports',
  'Exported values are used somewhere (app, stories or tests); an export nothing imports is dead',
  prod
    .filter(
      (f) =>
        rel(f).startsWith('packages/') &&
        !f.endsWith('fixtures.ts') &&
        !f.includes('/sync/fake') &&
        !f.includes('testkit'),
    )
    .flatMap((f) =>
      [...text[f].matchAll(exportRe)]
        .map((m) => m[1])
        // Zod schemas are the public contract (rules/core.md), exported even when only types use them.
        .filter((name) => !name.endsWith('Schema'))
        .flatMap((name) => {
          // Stories and tests count: ICONS feeds the Icons page, SFX_CUES the soundboard.
          const users = all.filter(
            (g) => g !== f && !g.endsWith('index.ts') && new RegExp(`\\b${name}\\b`).test(text[g]),
          )
          // Used only inside its own file: the `export` is unneeded (cosmetic).
          return users.length ? [] : [`${rel(f)} — ${name} is exported but nothing imports it`]
        }),
    ),
)

// Everything that can name a dependency: sources, scripts/*.ts, configs, CI, and test pragmas
// (`@vitest-environment jsdom` is how jsdom is used).
const allText =
  Object.values(text).join('\n') +
  walk(ROOT, (p) => /\.(mjs|ts|json|yml|css)$/.test(p) && !p.endsWith('package.json'))
    .map(read)
    .join('\n')
const deps = []
for (const pkgFile of [
  ...globSync('{packages,apps}/*/package.json', { cwd: ROOT }),
  'package.json',
]) {
  const pkg = JSON.parse(read(join(ROOT, pkgFile)))
  const scripts = Object.values(pkg.scripts ?? {}).join(' ')
  for (const d of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (/^(@types\/|typescript$|react-dom$|react$)/.test(d)) continue
    const bin = d.split('/').pop()
    if (
      !allText.includes(`@vitest-environment ${d}`) &&
      !allText.includes(`'${d}`) &&
      !allText.includes(`"${d}`) &&
      !scripts.includes(bin) &&
      !scripts.includes(d.replace(/-tools$/, ''))
    )
      deps.push(`${pkgFile} — ${d}`)
  }
}
probe('unused-deps', 'Dependencies are used (CONVENTIONS 8)', deps)

// ── ratchets from drift audits ──
probe(
  'light-patches',
  'Daylight differences are tokens in tokens.css, never [data-theme="light"] overrides in components.css (rules/ui.md)',
  read(join(ROOT, 'packages/ui/src/styles/components.css'))
    .split('\n')
    .map((l, i) => [l, i + 1])
    .filter(([l]) => /\[data-theme=/.test(l))
    .map(([l, n]) => `components.css:${n} — ${l.trim()}`),
)
probe(
  'story-determinism',
  'Stories are deterministic: no Date.now() or Math.random(); use fixtures or rng(seed) (rules/storybook.md)',
  linesMatching(all.filter(isStory), /\bDate\.now\(|Math\.random\(/),
)
{
  const testing = read(join(ROOT, 'docs/TESTING.md'))
  probe(
    'spec-docs',
    'Every e2e spec and unit test file is named in docs/TESTING.md (rules/testing.md)',
    [...all, ...walk(join(ROOT, '.claude/hooks'), (p) => p.endsWith('.test.mjs'))]
      .filter((f) => /\.(spec|test)\.(tsx?|mjs)$/.test(f))
      .filter((f) => !testing.includes(basename(f)))
      .map((f) => `${rel(f)} — not in docs/TESTING.md`),
  )
}

{
  // The Tailwind colour utilities the harness tells people to use must exist: a utility is only
  // generated for a colour mapped in tokens.css's @theme block (bg-sunk works, bg-amber doesn't).
  const theme =
    read(join(ROOT, 'packages/ui/src/styles/tokens.css')).match(
      /@theme inline \{([\s\S]*?)\}/,
    )?.[1] ?? ''
  const mapped = new Set([...theme.matchAll(/--color-([a-z-]+):/g)].map((m) => m[1]))
  const tokens = new Set(
    [
      ...read(join(ROOT, 'packages/ui/src/styles/tokens.css')).matchAll(/^\s+--([a-z0-9-]+):/gm),
    ].map((m) => m[1]),
  )
  const harness = [
    'CLAUDE.md',
    'CONVENTIONS.md',
    ...globSync('docs/*.md', { cwd: ROOT }),
    ...globSync('.claude/**/*.md', { cwd: ROOT }),
  ]
  probe(
    'harness-utilities',
    'Tailwind colour utilities named in the harness are mapped in tokens.css @theme (rules/ui.md)',
    harness.flatMap((f) =>
      [...read(join(ROOT, f)).matchAll(/`(?:bg|text|border)-([a-z-]+)`/g)]
        .filter((m) => tokens.has(m[1]) && !mapped.has(m[1]))
        .map((m) => `${f} — ${m[0]} has no --color-${m[1]} in @theme`),
    ),
  )
}

{
  // Foundations › Motion promises every keyframe; DESIGN.md and the soundboards promise every cue.
  const motion = read(join(ROOT, 'packages/ui/src/styles/motion.css'))
  const motionPage = read(join(ROOT, 'apps/storybook/src/foundations/Motion.stories.tsx'))
  probe(
    'motion-tiles',
    'Every keyframe in motion.css has a tile on Foundations › Motion (storybook-review skill)',
    [...motion.matchAll(/@keyframes\s+(\w+)/g)]
      .map((m) => m[1])
      .filter((k) => !motionPage.includes(`name: '${k}'`))
      .map((k) => `motion.css — @keyframes ${k} has no tile on the Motion page`),
  )
  const design = read(join(ROOT, 'docs/DESIGN.md'))
  const sfx = read(join(ROOT, 'packages/ui/src/feel/sfx.ts'))
  const cues = [
    ...(sfx.match(/SFX_CUES[^=]*=\s*\[([\s\S]*?)\]/)?.[1] ?? '').matchAll(/'(\w+)'/g),
  ].map((m) => m[1])
  const soundPage = read(join(ROOT, 'apps/storybook/src/foundations/Sound.stories.tsx'))
  const haptics = read(join(ROOT, 'packages/ui/src/feel/haptics.ts'))
  const patterns = [
    ...(haptics.match(/HAPTICS[^=]*=\s*\{([\s\S]*?)\n\}/)?.[1] ?? '').matchAll(/^\s+(\w+):/gm),
  ].map((m) => m[1])
  const hapticPage = read(join(ROOT, 'apps/storybook/src/foundations/Haptics.stories.tsx'))
  probe(
    'feel-docs',
    'Every sound cue and haptic pattern is in DESIGN.md and on its Foundations page (rules/ui.md)',
    [
      ...cues.flatMap((c) => [
        ...(design.includes(`\`${c}\``) ? [] : [`DESIGN.md — sound \`${c}\` is missing`]),
        ...(new RegExp(`^\\s+${c}:`, 'm').test(soundPage)
          ? []
          : [`Sound.stories.tsx — no pad for \`${c}\``]),
      ]),
      ...patterns.flatMap((h) => [
        ...(design.includes(`\`${h}\``) ? [] : [`DESIGN.md — haptic \`${h}\` is missing`]),
        ...(new RegExp(`^\\s+${h}:`, 'm').test(hapticPage)
          ? []
          : [`Haptics.stories.tsx — no row for \`${h}\``]),
      ]),
    ],
  )
}

// ── harness coverage ──
const ruleGlobs = globSync('.claude/rules/*.md', { cwd: ROOT }).flatMap((f) => {
  const fm = read(join(ROOT, f)).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
  return [...fm.matchAll(/^\s+-\s+["']?([^"'\n]+)["']?$/gm)].map((m) => m[1])
})
const covered = new Set(ruleGlobs.flatMap((g) => globSync(g, { cwd: ROOT })))
probe(
  'rule-coverage',
  'Every source file is covered by at least one path rule (.claude/rules)',
  [
    ...new Set(
      prod
        .map((f) => rel(f))
        .filter((f) => !covered.has(f))
        .map((f) => dirname(f)),
    ),
  ].map((d) => `${d}/ — no rule covers it`),
)
probe(
  'suppressions',
  'Lint suppressions carry a reason (review that each still applies)',
  linesMatching(prod, /biome-ignore/, (_f, l) => /biome-ignore\S*\s+\S+:\s*\S/.test(l)),
)
probe(
  'todos',
  'No forgotten TODO/FIXME/console.log in shipped code',
  linesMatching(
    prod.filter((f) => !rel(f).startsWith('e2e/')),
    /\b(TODO|FIXME|XXX)\b|console\.log\(/,
  ),
)

// ── report ──
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(probes, null, 2))
} else {
  const total = probes.reduce((n, p) => n + p.findings.length, 0)
  console.log(
    `# Drift probes — ${total} finding${total === 1 ? '' : 's'} across ${probes.length} probes\n`,
  )
  console.log('| Probe | Rule | Findings |\n|---|---|---|')
  for (const p of probes) console.log(`| \`${p.id}\` | ${p.rule} | ${p.findings.length || '✓'} |`)
  for (const p of probes.filter((x) => x.findings.length)) {
    console.log(`\n## ${p.id} (${p.findings.length})\n_${p.rule}_\n`)
    for (const f of p.findings.slice(0, 40)) console.log(`- ${f}`)
    if (p.findings.length > 40) console.log(`- … and ${p.findings.length - 40} more`)
  }
}
