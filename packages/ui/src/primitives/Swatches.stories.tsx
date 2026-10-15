import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Chip } from '../brand/Chip'
import { PLAYER_COLOR_NAMES } from '../brand/palette'
import { Swatches } from './Swatches'

const meta: Meta<typeof Swatches> = { title: 'Primitives/Swatches', component: Swatches }
export default meta
type Story = StoryObj<typeof Swatches>

function Demo({ initial, taken }: { initial: number; taken?: number[] }) {
  const [v, setV] = useState(initial)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Chip name="Ana" color={v} size={44} />
        <b>{PLAYER_COLOR_NAMES[v]}</b>
      </div>
      <Swatches value={v} onChange={setV} label="Ana's colour" taken={taken} />
    </div>
  )
}

/** Pick a chip colour. Tab in, then use the arrow keys. */
export const Picker: Story = { render: () => <Demo initial={0} /> }
/** Colours other players wear are dimmed (still choosable). */
export const WithTaken: Story = { render: () => <Demo initial={3} taken={[0, 1, 4]} /> }
