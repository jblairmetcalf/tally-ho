import type { Meta, StoryObj } from '@storybook/react'
import { Chip, PLAYER_COLOR_NAMES, PLAYER_COLORS, type ThemeId } from '@tally/ui'
import { BARE, Mono, Page, pageTheme, Section, Tag, ThemePair } from './chrome'
import { contrast, grade, gradeTone, TOKENS } from './colour'

const meta: Meta = { title: 'Foundations/Colour', tags: ['!autodocs'], parameters: BARE }
export default meta
type Story = StoryObj

interface Role {
  token: string
  use: string
}

const GROUPS: { title: string; note: string; ratios?: boolean; roles: Role[] }[] = [
  {
    title: 'The table',
    note: 'Four steps of surface, from the felt to the raised card, and the hairline between them.',
    roles: [
      { token: 'page', use: 'the felt' },
      { token: 'sunk', use: 'wells, inputs, sheets' },
      { token: 'surface', use: 'cards' },
      { token: 'surface-hi', use: 'pills, ghost buttons' },
      { token: 'line', use: 'borders, hairlines' },
    ],
  },
  {
    title: 'Ink',
    ratios: true,
    note: 'Three weights of text. Faint is for hints and placeholders, never for anything you must read.',
    roles: [
      { token: 'text', use: 'body, names' },
      { token: 'muted', use: 'labels, eyebrows' },
      { token: 'faint', use: 'hints, placeholders' },
    ],
  },
  {
    title: 'Jewels',
    ratios: true,
    note: 'Fills use the plain token, the pressed edge uses -deep, and small coloured text uses -text (darker in Daylight so it stays readable).',
    roles: [
      { token: 'jade', use: 'go, on, live' },
      { token: 'jade-deep', use: 'jade press edge' },
      { token: 'jade-text', use: 'small jade text' },
      { token: 'amber', use: 'start, crown, lead' },
      { token: 'amber-deep', use: 'amber press edge' },
      { token: 'amber-text', use: 'small amber text' },
      { token: 'amber-display', use: 'champion & victory type' },
      { token: 'fox', use: 'match point' },
      { token: 'fox-deep', use: 'victory name shadow' },
      { token: 'coral', use: 'delete, danger, tiebreak' },
      { token: 'coral-deep', use: 'coral press edge' },
      { token: 'coral-text', use: 'small coral text' },
      { token: 'lav', use: 'notices, low-wins tag' },
      { token: 'cream', use: 'the toast' },
      { token: 'ink', use: 'the brand disc, chip initials' },
      { token: 'on-accent', use: 'text on any jewel' },
    ],
  },
  {
    title: 'Shade & glass',
    note: 'Translucent layers: drop shadows, the zebra stripe, the sheet scrim, the nav glass and the victory veil.',
    roles: [
      { token: 'drop', use: '3-D edges' },
      { token: 'drop-soft', use: 'pill edges' },
      { token: 'zebra', use: 'round log stripes' },
      { token: 'scrim', use: 'behind a sheet' },
      { token: 'bar-bg', use: 'the tab bar: the opposite theme, so it stands out' },
      { token: 'bar-ink', use: 'tab labels and icons' },
      { token: 'bar-on', use: 'the current tab' },
      { token: 'nav-fade', use: 'under the tab bar' },
      { token: 'veil', use: 'behind victory' },
    ],
  },
]

/** The text-on-background pairings the components actually make. */
const PAIRS: { fg: string; bg: string; what: string; large?: boolean }[] = [
  { fg: 'text', bg: 'page', what: 'Body on the page' },
  { fg: 'text', bg: 'surface', what: 'Body on a card' },
  { fg: 'text', bg: 'sunk', what: 'Input text' },
  { fg: 'muted', bg: 'page', what: 'Eyebrows' },
  { fg: 'muted', bg: 'surface', what: 'Card labels' },
  { fg: 'faint', bg: 'surface', what: 'Hints (decorative)' },
  { fg: 'jade-text', bg: 'page', what: 'Links, live labels' },
  { fg: 'jade-text', bg: 'surface', what: 'Lit icon buttons' },
  { fg: 'amber-text', bg: 'surface', what: 'Rank 1' },
  { fg: 'coral-text', bg: 'page', what: 'Errors' },
  { fg: 'coral-text', bg: 'surface', what: 'Coral buttons' },
  { fg: 'on-accent', bg: 'jade', what: 'Jade button label' },
  { fg: 'on-accent', bg: 'amber', what: 'Amber button label' },
  { fg: 'on-accent', bg: 'coral', what: 'Armed delete' },
  { fg: 'on-accent', bg: 'lav', what: 'Low-wins tag' },
  { fg: 'ink', bg: 'cream', what: 'Toast (dark)' },
  { fg: 'bar-ink', bg: 'bar-bg', what: 'Tab labels (the bar wears the other theme)' },
  { fg: 'bar-on', bg: 'bar-bg', what: 'The current tab' },
  {
    fg: 'amber-display',
    bg: 'page',
    what: 'Champion name (ink drop shadow in Daylight)',
    large: true,
  },
]

function Ratio({
  fg,
  bg,
  theme,
  kind = 'text',
}: {
  fg: string
  bg: string
  theme: ThemeId
  kind?: 'text' | 'ui'
}) {
  const t = TOKENS[theme]
  const r = contrast(t[fg] ?? '', t[bg] ?? '')
  if (r == null) return <span className="hint">n/a</span>
  const g = grade(r, kind)
  return (
    <span className="inline-flex items-center gap-1.5">
      <b className="num">{r.toFixed(2)}</b>
      <Tag tone={gradeTone(g)}>{g}</Tag>
    </span>
  )
}

function Swatch({ role, theme, ratios }: { role: Role; theme: ThemeId; ratios?: boolean }) {
  const value = TOKENS[theme][role.token] ?? '—'
  const isHex = value.startsWith('#')
  return (
    <div className="flex flex-col overflow-hidden rounded-[16px] border-[1.5px] border-line bg-surface">
      <div
        className="relative h-[68px]"
        style={{
          background: isHex
            ? `var(--${role.token})`
            : `linear-gradient(var(--${role.token}), var(--${role.token})), repeating-conic-gradient(var(--line) 0 25%, transparent 0 50%) 0 0 / 14px 14px`,
        }}
      />
      <div className="flex flex-col gap-1 p-3">
        <Mono>--{role.token}</Mono>
        <span className="text-[12.5px] text-muted">{role.use}</span>
        <Mono className="text-faint">{value}</Mono>
        {isHex && ratios && (
          <div className="mt-1 flex flex-col gap-0.5 text-[11.5px]">
            <span className="flex justify-between gap-2">
              <span className="text-muted">vs page</span>
              <Ratio fg={role.token} bg="page" theme={theme} />
            </span>
            <span className="flex justify-between gap-2">
              <span className="text-muted">vs surface</span>
              <Ratio fg={role.token} bg="surface" theme={theme} />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export const Colour: Story = {
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      title="Colour"
      lede={
        <>
          An ink-dark card table lit by jewels, and its sunny twin, <b>Daylight</b>. Components name
          a role (<Mono>var(--surface)</Mono>, <Mono>text-muted</Mono>), never a hex; the theme
          decides what that role looks like. Every value and ratio below is read straight from{' '}
          <Mono>tokens.css</Mono> and computed here with the WCAG 2 formula.
        </>
      }
    >
      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title} note={g.note}>
          <ThemePair>
            {(theme) => (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {g.roles.map((r) => (
                  <Swatch key={r.token} role={r} theme={theme} ratios={g.ratios} />
                ))}
              </div>
            )}
          </ThemePair>
        </Section>
      ))}

      <Section
        title="Pairings"
        note="Every text-on-fill combination the components make, with its contrast ratio. AA (4.5) for body text; AA large (3) is acceptable only for big display type."
      >
        <ThemePair>
          {(theme) => (
            <div className="flex flex-col">
              {PAIRS.map((p) => (
                <div
                  key={`${p.fg}/${p.bg}`}
                  className="grid grid-cols-[92px_1fr_auto] items-center gap-3 border-line border-b py-2 last:border-b-0"
                >
                  <span
                    className="grid h-[40px] place-items-center rounded-[10px] border border-line"
                    style={{ background: `var(--${p.bg})`, color: `var(--${p.fg})` }}
                  >
                    <span className={p.large ? 'display text-[24px]' : 'font-black'}>Aa 42</span>
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <b className="text-[13.5px]">{p.what}</b>
                    <Mono className="text-faint">
                      {p.fg} on {p.bg}
                    </Mono>
                  </span>
                  <Ratio fg={p.fg} bg={p.bg} theme={theme} />
                </div>
              ))}
            </div>
          )}
        </ThemePair>
      </Section>

      <Section
        title="The eight chips"
        note={
          <>
            Players wear one of the prototype's eight colours, stored as an index (0–7) and rendered
            with <Mono>paletteVar(i)</Mono>. They are the same in both themes. The initial on the
            chip is always ink; the chip itself must stand out from the felt (3:1 for non-text UI).
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PLAYER_COLORS.map((hex, i) => {
            const onInk = contrast(TOKENS.dark.ink ?? '#13112e', hex) ?? 0
            const vsDark = contrast(hex, TOKENS.dark.page ?? '') ?? 0
            const vsLight = contrast(hex, TOKENS.light.page ?? '') ?? 0
            return (
              <div key={hex} className="card flex flex-col items-center gap-2 text-center">
                <Chip name={PLAYER_COLOR_NAMES[i] ?? '?'} color={i} size={64} />
                <b className="display text-[22px]">{PLAYER_COLOR_NAMES[i]}</b>
                <Mono className="text-muted">
                  --p{i} · {hex}
                </Mono>
                <div className="flex w-full flex-col gap-1 text-[11.5px]">
                  <span className="flex justify-between">
                    <span className="text-muted">ink initial</span>
                    <span className="inline-flex gap-1">
                      <b className="num">{onInk.toFixed(1)}</b>
                      <Tag tone={gradeTone(grade(onInk))}>{grade(onInk)}</Tag>
                    </span>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-muted">on Dark felt</span>
                    <span className="inline-flex gap-1">
                      <b className="num">{vsDark.toFixed(1)}</b>
                      <Tag tone={gradeTone(grade(vsDark, 'ui'))}>{grade(vsDark, 'ui')}</Tag>
                    </span>
                  </span>
                  <span className="flex justify-between">
                    <span className="text-muted">on Daylight</span>
                    <span className="inline-flex gap-1">
                      <b className="num">{vsLight.toFixed(1)}</b>
                      <Tag tone={gradeTone(grade(vsLight, 'ui'))}>{grade(vsLight, 'ui')}</Tag>
                    </span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="hint m-0">
          On Daylight paper every chip falls under 3:1 against the felt. That is by design, and why
          each chip carries an ink initial (AAA everywhere), a drop shadow and a dashed ring, and
          why a player's name always sits beside their chip: colour is never the only cue.
        </p>
      </Section>
    </Page>
  ),
}
