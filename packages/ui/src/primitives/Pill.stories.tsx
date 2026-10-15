import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Icon } from '../brand/Icon'
import { Pill, PillRow } from './Pill'

const meta: Meta<typeof Pill> = {
  title: 'Primitives/Pill',
  component: Pill,
  args: { children: 'Rummy', on: false, onClick: () => {} },
}
export default meta
type Story = StoryObj<typeof Pill>

export const Off: Story = {}
/** Selected: jade, pops in. */
export const On: Story = { args: { on: true } }
/** With a player chip (the History winner filter). */
export const WithChip: Story = { args: { children: 'Ana', chip: { name: 'Ana', color: 0 } } }
/** The "low score wins" tag on a preset. */
export const LowTag: Story = {
  args: {
    children: (
      <>
        Hearts <span className="low-tag">Low</span>
      </>
    ),
  },
}

const GAMES = ['Rummy', 'Hearts', 'Yahtzee', 'Uno', 'Scrabble', 'Phase 10']

/** Pick one (the New game sheet), with "Other" at the end. */
export const Row: Story = {
  render: () => {
    const [sel, setSel] = useState('Rummy')
    return (
      <PillRow label="Game">
        {GAMES.map((g) => (
          <Pill key={g} on={sel === g} onClick={() => setSel(g)}>
            {g}
          </Pill>
        ))}
        <Pill on={sel === 'other'} onClick={() => setSel('other')}>
          <Icon name="plus" size={16} />
          Other
        </Pill>
      </PillRow>
    )
  },
}

const PEOPLE = ['Everyone', 'Ana', 'Ben', 'Cleo', 'Dev', 'Esme']

/** `scroll`: one line that scrolls sideways (History filters). */
export const Scrolling: Story = {
  render: () => {
    const [sel, setSel] = useState(0)
    return (
      <PillRow scroll label="Winner">
        {PEOPLE.map((p, i) => (
          <Pill
            key={p}
            on={sel === i}
            onClick={() => setSel(i)}
            chip={i === 0 ? undefined : { name: p, color: i - 1 }}
          >
            {p}
          </Pill>
        ))}
      </PillRow>
    )
  },
}
