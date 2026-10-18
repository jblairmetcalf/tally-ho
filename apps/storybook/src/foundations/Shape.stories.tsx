import type { Meta, StoryObj } from '@storybook/react'
import { Badge, Button, Chip, IconButton, Switch } from '@tally/ui'
import { type CSSProperties, type ReactNode, useState } from 'react'
import { BARE, Mono, Page, pageTheme, Section, ThemePair } from './chrome'

const meta: Meta = { title: 'Foundations/Shape', tags: ['!autodocs'], parameters: BARE }
export default meta
type Story = StoryObj

const RADII: { token: string; px: number; where: string }[] = [
  { token: '--r-sm', px: 12, where: 'pills, small buttons' },
  { token: '--r-btn', px: 14, where: 'buttons, inputs, icon buttons' },
  { token: '--r', px: 16, where: 'cards, notices, game rows' },
  { token: '--r-nav', px: 22, where: 'the tab bar' },
  { token: '--r-sheet', px: 26, where: 'sheet top corners' },
  { token: '50%', px: 999, where: 'chips, badge, FAB, swatches' },
]

const LAYERS = ['page', 'sunk', 'surface', 'surface-hi'] as const

const pressed = (edge: string): CSSProperties => ({
  transform: 'translateY(3px) scale(.98)',
  boxShadow: `0 1px 0 var(${edge})`,
})

function LiveSwitch() {
  const [on, setOn] = useState(true)
  return <Switch checked={on} onChange={setOn} label="Example switch" />
}

export const Shape: Story = {
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      title="Shape"
      lede={
        <>
          Everything is chunky, rounded and a little bit physical, like game pieces. Buttons are
          slabs on a darker edge that squash when you press them; chips are poker chips; cards stack
          up from the felt. Nothing is sharp.
        </>
      }
    >
      <Section
        title="Corners"
        note="Radii grow with the size of the thing. Small controls are tight, the sheet is generous."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {RADII.map((r) => (
            <div key={r.token} className="flex flex-col gap-2">
              <div
                className="grid h-[96px] place-items-center border-[2.5px] border-jade bg-surface"
                style={{
                  borderRadius: r.px === 999 ? '50%' : r.px,
                  width: r.px === 999 ? 96 : '100%',
                }}
              >
                <span className="display text-[26px]">{r.px === 999 ? '●' : r.px}</span>
              </div>
              <Mono>{r.token}</Mono>
              <span className="text-[12.5px] text-muted">{r.where}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="The 3-D press"
        note="A solid 4px edge below every slab (the -deep token, or --line for ghost). On press it drops 3px and the edge shrinks to 1px — a real button going down. Press the live ones."
      >
        <ThemePair>
          {() => (
            <div className="grid grid-cols-[1fr_1fr] gap-x-4 gap-y-3">
              <span className="sb-label m-0">Rest · live</span>
              <span className="sb-label m-0">Pressed</span>
              {(
                [
                  ['jade', '--jade-deep', 'Save'],
                  ['amber', '--amber-deep', 'Deal in'],
                  ['ghost', '--line', 'Add'],
                ] as const
              ).map(([v, edge, label]) => (
                <div key={v} className="contents">
                  <Button variant={v} block>
                    {label}
                  </Button>
                  <span
                    aria-hidden="true"
                    className={`btn btn-${v} btn-block`}
                    style={pressed(edge)}
                  >
                    {label}
                  </span>
                </div>
              ))}
              <span className="pill">Rummy</span>
              <span className="pill on" style={{ animation: 'none' }}>
                Hearts
              </span>
            </div>
          )}
        </ThemePair>
      </Section>

      <Section
        title="Layers"
        note="Four surfaces stack from the felt up. Each step is lighter in Dark and whiter in Daylight; a 1.5px --line border separates them."
      >
        <ThemePair>
          {() => (
            <div
              className="rounded-[18px] p-4"
              style={{ background: 'var(--page)', border: '1.5px dashed var(--line)' }}
            >
              <Mono className="text-muted">page</Mono>
              {LAYERS.slice(1).reduceRight<ReactNode>(
                (inner, layer) => (
                  <div
                    key={layer}
                    className="mt-2 rounded-[16px] border-[1.5px] border-line p-4"
                    style={{ background: `var(--${layer})` }}
                  >
                    <Mono className="text-muted">{layer}</Mono>
                    {inner}
                  </div>
                ),
                <div className="mt-2 flex items-center gap-2">
                  <Chip name="Ana" color={0} size={34} />
                  <b>Ana</b>
                </div>,
              )}
            </div>
          )}
        </ThemePair>
      </Section>

      <Section title="Pieces" note="The recurring objects, at a glance.">
        <ThemePair>
          {() => (
            <div className="flex flex-wrap items-center gap-5">
              <Chip name="Ben" color={1} size={44} crown />
              <span className="swatch" style={{ '--c': 'var(--p3)' } as CSSProperties} />
              <IconButton icon="volume" label="Sound on" on />
              <LiveSwitch />
              <Badge />
            </div>
          )}
        </ThemePair>
      </Section>
    </Page>
  ),
}
