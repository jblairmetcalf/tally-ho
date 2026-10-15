import type { Meta, StoryObj } from '@storybook/react'
import { Eyebrow, SectionTitle } from '@tally/ui'
import { BARE, Mono, Page, pageTheme, Section, ThemePair } from './chrome'

const meta: Meta = { title: 'Foundations/Type', parameters: BARE }
export default meta
type Story = StoryObj

const DISPLAY: { size: number; sample: string; where: string; cls?: string; amber?: boolean }[] = [
  { size: 72, sample: 'Grandma!', where: 'The victory name (clamped 48–72)', amber: true },
  { size: 42, sample: '187', where: 'Player totals, the ribbon' },
  { size: 34, sample: 'The record', where: 'The wordmark, screen titles', amber: true },
  { size: 28, sample: 'Rummy', where: 'Game title, score inputs' },
  { size: 26, sample: 'New game', where: 'Sheet titles, stats, wins' },
  { size: 20, sample: 'Standings', where: 'Section titles (h2.sec)' },
]

const WEIGHTS: { w: number; name: string; where: string }[] = [
  { w: 600, name: 'SemiBold', where: 'Rarely: long-form help' },
  { w: 700, name: 'Bold', where: 'Body text: the base weight' },
  { w: 800, name: 'ExtraBold', where: 'Inputs, pills, sub-labels' },
  { w: 900, name: 'Black', where: 'Buttons, names, eyebrows' },
]

export const Type: Story = {
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      title="Type"
      lede={
        <>
          Two faces, both round and friendly. <b>Lilita One</b> is the shout: scores, names, titles,
          the ribbon. <b>Nunito</b> is the voice: heavy weights only, so everything reads like it
          was printed on a board-game box. Numbers use tabular figures (<Mono>.num</Mono>) so totals
          don't jiggle as they roll.
        </>
      }
    >
      <Section
        title="Display · Lilita One"
        note="One weight, six sizes. Big type wears a 3px drop shadow (--display-shadow) — black in Dark, ink in Daylight."
      >
        <div className="card flex flex-col gap-1 overflow-hidden" style={{ padding: 0 }}>
          {DISPLAY.map((d) => (
            <div
              key={d.size}
              className="grid grid-cols-[64px_1fr] items-baseline gap-4 border-line border-b px-5 py-3 last:border-b-0 sm:grid-cols-[64px_1fr_260px]"
            >
              <Mono className="text-faint">{d.size}px</Mono>
              <span
                className="display truncate"
                style={{
                  fontSize: d.size,
                  color: d.amber ? 'var(--amber-display)' : undefined,
                  textShadow: 'var(--display-shadow)',
                }}
              >
                {d.sample}
              </span>
              <span className="hidden text-[13px] text-muted sm:block">{d.where}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Body · Nunito"
        note="Base size 15px, line-height 1.4, weight 700. Never lighter than 600."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {WEIGHTS.map((w) => (
            <div key={w.w} className="card flex flex-col gap-1">
              <span className="flex items-baseline justify-between">
                <Mono className="text-faint">{w.w}</Mono>
                <span className="text-[12px] text-muted">{w.where}</span>
              </span>
              <span style={{ fontWeight: w.w, fontSize: 26 }}>{w.name}</span>
              <span style={{ fontWeight: w.w }}>
                Deal the first hand and the leaderboard starts here.
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Little labels" note="The supporting cast, in both themes.">
        <ThemePair>
          {() => (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Mono className="text-faint">.eyebrow · 11.5 / 900 / +0.14em / caps / muted</Mono>
                <Eyebrow>What are we playing?</Eyebrow>
              </div>
              <div className="flex flex-col gap-1">
                <Mono className="text-faint">.sec · Lilita 20</Mono>
                <SectionTitle>Who's winning over time</SectionTitle>
              </div>
              <div className="flex flex-col gap-1">
                <Mono className="text-faint">.hint · 12.5 / 700 / faint</Mono>
                <span className="hint">Blank counts as 0. Totals update as soon as you save.</span>
              </div>
              <div className="flex flex-col gap-1">
                <Mono className="text-faint">.num · tabular figures</Mono>
                <span className="display num text-[34px]">1,108 · 99 · 7</span>
              </div>
              <div className="flex flex-col gap-1">
                <Mono className="text-faint">.link · 14 / 900 / jade-text</Mono>
                <span className="link">See all →</span>
              </div>
            </div>
          )}
        </ThemePair>
      </Section>

      <Section
        title="Voice"
        note="The copy is part of the type system. Short, warm, a little bit of card-table swagger."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Deal in · Rummy', 'Buttons say what happens, with the game name.'],
            ['Ana takes the lead', 'Toasts narrate the game like a commentator.'],
            ['Tap again to delete', 'Danger asks twice, plainly.'],
          ].map(([a, b]) => (
            <div key={a} className="card flex flex-col gap-2">
              <span className="display text-[24px]">“{a}”</span>
              <span className="hint">{b}</span>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  ),
}
