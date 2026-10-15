import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Chip } from './Chip'
import { PLAYER_COLOR_NAMES } from './palette'

const meta: Meta<typeof Chip> = {
  title: 'Brand/Chip',
  component: Chip,
  args: { name: 'Ana', color: 0, size: 36, crown: false },
  argTypes: { color: { control: { type: 'range', min: 0, max: 7, step: 1 } } },
}
export default meta
type Story = StoryObj<typeof Chip>

/** The poker-chip avatar: colour, dashed inner ring, initial. */
export const Default: Story = {}

/** 20 (pills), 34–36 (rows, fields), 44 (pickers), 64 (champion). */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      {[20, 28, 36, 44, 64].map((s) => (
        <div key={s} className="flex flex-col items-center gap-1">
          <Chip name="Ben" color={1} size={s} />
          <span className="hint">{s}</span>
        </div>
      ))}
    </div>
  ),
}

/** All eight colours, by name. */
export const Palette: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      {PLAYER_COLOR_NAMES.map((n, i) => (
        <div key={n} className="flex flex-col items-center gap-1">
          <Chip name={n} color={i} size={44} />
          <span className="hint">{n}</span>
        </div>
      ))}
    </div>
  ),
}

/** The leader wears the crown; it drops in on a spring. Press to crown someone new. */
export const Crowned: Story = {
  render: () => {
    const names = ['Ana', 'Ben', 'Cleo']
    const [i, setI] = useState(0)
    return (
      <div className="flex items-center gap-6" style={{ paddingTop: 30 }}>
        {names.map((n, j) => (
          <Chip key={n} name={n} color={j} size={64} crown={i === j} crownKey={n} />
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setI((x) => (x + 1) % 3)}
        >
          Next leader
        </button>
      </div>
    )
  },
}

/** A dead heat on the champion card: an "=" chip in `var(--faint)`, no crown. */
export const DeadHeat: Story = { args: { name: '=', color: 'var(--faint)', size: 64 } }
