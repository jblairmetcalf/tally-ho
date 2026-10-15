import type { Meta, StoryObj } from '@storybook/react'
import { Button, ICONS, Icon, IconButton, type IconName } from '@tally/ui'
import { type CSSProperties, useState } from 'react'
import { BARE, Mono, Page, pageTheme, Section, ThemePair } from './chrome'

const meta: Meta = { title: 'Foundations/Icons', parameters: BARE }
export default meta
type Story = StoryObj

const NAMES = Object.keys(ICONS) as IconName[]

function Grid() {
  const [size, setSize] = useState(26)
  const [stroke, setStroke] = useState(2.4)
  return (
    <>
      <div className="card flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-3">
          <b>Size</b>
          <input
            type="range"
            min={14}
            max={48}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <Mono>{size}px</Mono>
        </label>
        <label className="flex items-center gap-3">
          <b>Stroke</b>
          <input
            type="range"
            min={1.4}
            max={3.4}
            step={0.1}
            value={stroke}
            onChange={(e) => setStroke(Number(e.target.value))}
          />
          <Mono>{stroke.toFixed(1)}</Mono>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {NAMES.map((n, i) => (
          <div
            key={n}
            className="card rise flex flex-col items-center gap-3"
            style={{ '--i': i % 12, padding: '18px 8px 12px' } as CSSProperties}
          >
            <span className="grid h-[48px] place-items-center">
              <Icon name={n} size={size} stroke={stroke} />
            </span>
            <Mono className="text-muted">{n}</Mono>
          </div>
        ))}
      </div>
    </>
  )
}

export const Icons: Story = {
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      title="Icons"
      lede={
        <>
          {NAMES.length} hand-drawn icons on a 24×24 grid: round caps, round joins, a heavy 2.4
          stroke to match Nunito Black, and <Mono>currentColor</Mono> so they take the colour of
          whatever holds them. The crown is the only filled one. Icons are decorative; the control
          around them carries the name.
        </>
      }
    >
      <Section title="The set">
        <Grid />
      </Section>
      <Section title="In context" note="Default 22px in buttons, 16–18px inline, 26px in the nav.">
        <ThemePair>
          {() => (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <IconButton icon="back" label="Back" />
                <IconButton icon="volume" label="Sound on" on />
                <IconButton icon="flag" label="End game" danger />
                <IconButton icon="gear" label="Settings" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon="plus">New game</Button>
                <Button variant="ghost" icon="repeat">
                  Rematch
                </Button>
              </div>
              <span className="link">
                See all <Icon name="right" size={16} />
              </span>
            </div>
          )}
        </ThemePair>
      </Section>
    </Page>
  ),
}
