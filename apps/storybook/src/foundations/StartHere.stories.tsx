import type { Meta, StoryObj } from '@storybook/react'
import { Badge, Chip, Fox, Icon, type IconName, Ribbon, Toast, Wordmark } from '@tally/ui'
import { type CSSProperties, useState } from 'react'
import { BARE, Mono, Page, pageTheme, Section, ThemePair } from './chrome'

const meta: Meta = { title: 'Foundations/Start here', tags: ['!autodocs'], parameters: BARE }
export default meta
type Story = StoryObj

const PRINCIPLES: { icon: IconName; tone: string; title: string; body: string }[] = [
  {
    icon: 'scroll',
    tone: 'lav',
    title: 'Faithful to the original',
    body: 'docs/imports/Tally Ho!.html is the reference. Its copy, timings, sounds and animations are ported, not reinterpreted. When in doubt, do what it does.',
  },
  {
    icon: 'flame',
    tone: 'fox',
    title: 'Joy is the feature',
    body: 'Scoring a round should feel like winning a hand: things bump, stamp and bleep, the fox twitches, confetti flies. Feel is built in, not sprinkled on.',
  },
  {
    icon: 'moon',
    tone: 'jade',
    title: 'Two themes, one vocabulary',
    body: 'Dark is the ink card table; Daylight is cream paper. Every component reads well in both, and small coloured text uses the -text tokens.',
  },
  {
    icon: 'cards',
    tone: 'amber',
    title: 'Tokens only',
    body: 'No raw colours in components. Classes from components.css and tokens from tokens.css; player colours are palette indices. The fox is the only exception.',
  },
]

const MAP: { file: string; what: string }[] = [
  { file: 'styles/tokens.css', what: 'Colour, type, shape and the spring, per theme' },
  { file: 'styles/motion.css', what: 'Every keyframe, plus the reduced-motion kill switch' },
  { file: 'styles/components.css', what: 'The prototype’s classes: .card .pill .seg .sheet …' },
  { file: 'feel/', what: 'SFX, Haptics and FX confetti' },
  { file: 'brand/', what: 'Fox, Chip, Icon, Wordmark, Badge, the palette' },
  { file: 'primitives/', what: 'Buttons, pills, sheets, toasts, the nav' },
  { file: 'scoreboard/', what: 'Player cards, race track, round log, victory' },
]

function FoxStates() {
  const [k, setK] = useState(0)
  const states = [
    { label: 'Idle — blinks', props: {} },
    { label: 'Crowned', props: { crown: true } },
    { label: 'Victory wink', props: { crown: true, wink: true } },
    { label: 'Ear twitch', props: { twitch: true } },
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {states.map((s) => (
          <div key={s.label} className="card flex flex-col items-center gap-2">
            <div className="badge" style={{ width: 120, height: 120 }}>
              <Fox key={k} {...s.props} className="h-[100px] w-[100px]" />
            </div>
            <b>{s.label}</b>
          </div>
        ))}
      </div>
      <button type="button" className="link self-start" onClick={() => setK((x) => x + 1)}>
        <Icon name="repeat" size={16} /> Play them again
      </button>
    </div>
  )
}

/** Storybook's own shortcuts: the quickest way through the library. */
const KEYS: [string, string][] = [
  ['⌘ K  or  /', 'Search for a component or state'],
  ['⌥ ↓   ⌥ ↑', 'Next / previous component'],
  ['⌥ →   ⌥ ←', 'Next / previous state of this component'],
  ['⌃ ⇧ ↑   ⌃ ⇧ ↓', 'Fold / unfold every section'],
  ['⌥ S', 'Hide the sidebar for a bigger canvas'],
  ['⌥ A', 'Show or hide the panel (controls, accessibility)'],
  ['⌥ F', 'Full screen'],
  ['Toolbar · Theme', 'Dark + Daylight side by side, or just one'],
]

function ReviewKeys() {
  return (
    <dl className="m-0 grid max-w-[720px] grid-cols-[minmax(150px,auto)_1fr] gap-x-6 gap-y-3">
      {KEYS.map(([keys, what]) => (
        <div key={keys} className="contents">
          <dt>
            <Mono className="whitespace-pre rounded-[8px] border border-line bg-surface px-2 py-1 text-[13px]">
              {keys}
            </Mono>
          </dt>
          <dd className="m-0 self-center text-muted">{what}</dd>
        </div>
      ))}
    </dl>
  )
}

export const StartHere: Story = {
  name: 'Start here',
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      eyebrow="Design system"
      title="Tally Ho!"
      lede={
        <>
          A score counter for family game night. Pick a game, add the players, and tap in each
          round's scores; Tally Ho! keeps the totals, cheers the leader, crowns the winner and
          remembers who's the family champion. It works offline as a PWA, and it should feel like a
          toy you want to pick up.
        </>
      }
    >
      <div className="card relative flex flex-col items-center gap-5 overflow-hidden py-10 text-center">
        <div className="sunburst" style={{ top: '45%' }} />
        <div className="relative flex items-center gap-4">
          <Badge crown />
          <Wordmark className="flex-none" />
        </div>
        <div className="relative flex items-end gap-3">
          {['Ana', 'Ben', 'Cleo', 'Dev'].map((n, i) => (
            <Chip key={n} name={n} color={i} size={i === 0 ? 56 : 40} crown={i === 0} />
          ))}
        </div>
        <div className="relative w-full">
          <Ribbon text="Round 3" inline />
        </div>
        <div className="relative flex w-full justify-center">
          <Toast placement="inline" message="Ana takes the lead" />
        </div>
      </div>

      <Section
        title="Reviewing fast"
        note="Every section starts folded. Open one, then use a component's Docs page: all of its states on one scroll, in both themes, with its description and controls. Sheets, overlays and whole screens fill the viewport, so they keep one entry per state."
      >
        <ReviewKeys />
      </Section>

      <Section
        title="Meet the fox"
        note="Drawn from the app icon. It blinks every few seconds, wears the champion's crown, winks when someone wins and twitches its ears after every scored round. Brand art: the only place raw colour is allowed."
      >
        <FoxStates />
      </Section>

      <Section title="Principles">
        <div className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className="card rise flex gap-4"
              style={{ '--i': i } as CSSProperties}
            >
              <span
                className="grid h-[52px] w-[52px] flex-none place-items-center rounded-[14px]"
                style={{
                  background: `var(--${p.tone})`,
                  color: 'var(--on-accent)',
                  boxShadow: '0 4px 0 var(--drop)',
                }}
              >
                <Icon name={p.icon} size={26} />
              </span>
              <div className="flex flex-col gap-1">
                <b className="display text-[24px]">{p.title}</b>
                <span className="text-[14px] text-muted">{p.body}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Both themes, always"
        note="The Storybook decorator renders every component in Dark and Daylight side by side. Use the toolbar to see one."
      >
        <ThemePair>
          {(t) => (
            <div className="flex items-center gap-3">
              <Badge />
              <div className="flex flex-col">
                <b className="display text-[26px]">{t === 'dark' ? 'Dark' : 'Daylight'}</b>
                <span className="hint">
                  {t === 'dark' ? 'The ink card table' : 'Cream card-table paper'}
                </span>
              </div>
            </div>
          )}
        </ThemePair>
      </Section>

      <Section
        title="Where things live"
        note={
          <>
            All in <Mono>packages/ui/src</Mono>, consumed as TypeScript source.
          </>
        }
      >
        <div className="card flex flex-col" style={{ padding: 6 }}>
          {MAP.map((m) => (
            <div
              key={m.file}
              className="grid grid-cols-[180px_1fr] items-center gap-3 rounded-[12px] px-3 py-2.5 odd:bg-[var(--zebra)]"
            >
              <Mono className="text-jade-text">{m.file}</Mono>
              <span className="text-[13.5px]">{m.what}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="House rules" note="The short version of CONVENTIONS.md.">
        <ol className="m-0 grid gap-3 p-0 sm:grid-cols-2" style={{ listStyle: 'none' }}>
          {[
            'Targets are at least 44px. Everything is keyboard reachable; icon-only controls have a name.',
            'Sounds from SFX, haptics from Haptics, confetti from FX. Components never play them on their own.',
            'Animations are the keyframes in motion.css. Never bypass the reduced-motion block.',
            'Every component has a story beside it covering each state, in both themes.',
          ].map((r, i) => (
            <li key={r} className="card flex items-start gap-3">
              <Chip name={String(i + 1)} color={i} size={34} />
              <span className="text-[14px]">{r}</span>
            </li>
          ))}
        </ol>
      </Section>
    </Page>
  ),
}
