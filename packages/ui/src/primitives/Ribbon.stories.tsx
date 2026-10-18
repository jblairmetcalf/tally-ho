import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from './Button'
import { Ribbon } from './Ribbon'

const meta: Meta<typeof Ribbon> = {
  title: 'Primitives/Ribbon',
  tags: ['!autodocs'],
  component: Ribbon,
  args: { text: 'Round 3', tone: 'jade', inline: true },
  argTypes: { tone: { control: 'inline-radio', options: ['jade', 'amber', 'coral'] } },
}
export default meta
type Story = StoryObj<typeof Ribbon>

/** Every new round. */
export const Jade: Story = {}
/** A new game starts, or the final round. */
export const Amber: Story = { args: { text: 'Final round!', tone: 'amber' } }
/** Tied at the top. */
export const Coral: Story = { args: { text: 'Tiebreak!', tone: 'coral' } }

/** The real thing: fixed, sweeping across the screen in 1.35 s. Press to replay. */
export const FlyThrough: Story = {
  parameters: { tally: { overlay: true } },
  render: () => {
    const [b, setB] = useState({ k: 0, i: 0 })
    const all = [
      { text: 'Round 2', tone: 'jade' as const },
      { text: 'Rummy!', tone: 'amber' as const },
      { text: 'Tiebreak!', tone: 'coral' as const },
    ]
    const cur = all[b.i % all.length]!
    return (
      <>
        <Button onClick={() => setB((x) => ({ k: x.k + 1, i: x.i + 1 }))}>Next banner</Button>
        {b.k > 0 && <Ribbon key={b.k} text={cur.text} tone={cur.tone} />}
      </>
    )
  },
}
