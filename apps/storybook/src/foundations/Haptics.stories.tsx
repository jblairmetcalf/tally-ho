import type { Meta, StoryObj } from '@storybook/react'
import { HAPTICS, type HapticCue, Haptics, Icon } from '@tally/ui'
import { useState } from 'react'
import { BARE, Mono, Page, pageTheme, Section } from './chrome'

const meta: Meta = { title: 'Foundations/Haptics', tags: ['!autodocs'], parameters: BARE }
export default meta
type Story = StoryObj

const WHEN: Record<HapticCue, string> = {
  tap: 'A light tick for taps',
  pick: 'Choosing an option',
  submit: 'A round is scored',
  add: 'A player joins',
  lead: 'A new leader',
  match: 'Match point',
  error: 'Nope',
  del: 'Something deleted',
  win: 'Victory',
}

/** Draw a vibration pattern: filled bars buzz, gaps rest. */
function Pattern({ p }: { p: number | readonly number[] }) {
  const parts = typeof p === 'number' ? [p] : [...p]
  const total = parts.reduce((a, b) => a + b, 0)
  return (
    <div className="flex h-[18px] w-full overflow-hidden rounded-[6px] bg-sunk" aria-hidden="true">
      {parts.map((ms, i) => (
        <span
          key={i}
          style={{
            width: `${(ms / Math.max(total, 120)) * 100}%`,
            background: i % 2 === 0 ? 'var(--jade)' : 'transparent',
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  )
}

function Pad({ cue }: { cue: HapticCue }) {
  const [k, setK] = useState(0)
  const p = HAPTICS[cue]
  return (
    <button
      type="button"
      className="card flex flex-col items-start gap-2 text-left"
      onClick={() => {
        Haptics.play(cue)
        setK((x) => x + 1)
      }}
    >
      <span className="flex w-full items-center justify-between">
        <span
          key={k}
          className="display text-[26px]"
          style={{ animation: k ? 'shake .35s' : undefined }}
        >
          {cue}
        </span>
        <Mono className="text-faint">{Array.isArray(p) ? `[${p.join(', ')}]` : `${p}ms`}</Mono>
      </span>
      <Pattern p={p} />
      <span className="text-[13px] text-muted">{WHEN[cue]}</span>
    </button>
  )
}

export const HapticsPage: Story = {
  name: 'Haptics',
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      title="Haptics"
      lede={
        <>
          A little buzz in the hand when it matters. Named patterns live in <Mono>HAPTICS</Mono> and
          play with <Mono>Haptics.play('submit')</Mono>. Open this page on a phone and tap the pads;
          on a laptop nothing happens, and that's fine.
        </>
      }
    >
      <Section title="Patterns" note="Bars are buzzes, gaps are rests, drawn to scale.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(HAPTICS) as HapticCue[]).map((cue) => (
            <Pad key={cue} cue={cue} />
          ))}
        </div>
      </Section>
      <Section title="Platforms">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card flex flex-col gap-2">
            <span className="flex items-center gap-2">
              <Icon name="bolt" />
              <b className="display text-[22px]">Android & Chrome</b>
            </span>
            <span className="text-[13.5px] text-muted">
              The Vibration API plays each pattern exactly:{' '}
              <Mono>navigator.vibrate([10, 40, 10])</Mono>.
            </span>
          </div>
          <div
            className="card flex flex-col gap-2"
            style={{ borderColor: 'var(--lav)', borderStyle: 'dashed' }}
          >
            <span className="flex items-center gap-2">
              <Icon name="gear" />
              <b className="display text-[22px]">iOS: the switch-tick fallback</b>
            </span>
            <span className="text-[13.5px] text-muted">
              Safari has no Vibration API. Since iOS 18, toggling an{' '}
              <Mono>{'<input type="checkbox" switch>'}</Mono> plays the system tick, so each buzz in
              a pattern becomes one tick (spaced like the pattern) on a hidden switch. Ticks only
              fire inside a user gesture, so later pulses are best-effort.
            </span>
          </div>
        </div>
        <p className="hint m-0">
          Haptics respect the player's setting via Haptics.setEnabled(), and are always paired with
          something you can see.
        </p>
      </Section>
    </Page>
  ),
}
