import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Segmented } from './Segmented'

const meta: Meta = { title: 'Primitives/Segmented' }
export default meta
type Story = StoryObj

type Goal = 'score' | 'rounds' | 'open'
const GOALS: { value: Goal; label: string }[] = [
  { value: 'score', label: 'Score target' },
  { value: 'rounds', label: 'Rounds' },
  { value: 'open', label: 'Open-ended' },
]

function Demo({ initial }: { initial: Goal }) {
  const [v, setV] = useState<Goal>(initial)
  return <Segmented options={GOALS} value={v} onChange={setV} label="How does it end?" />
}

/** "How does it end?" Tab in, then use the arrow keys. */
export const ScoreTarget: Story = { render: () => <Demo initial="score" /> }
export const OpenEnded: Story = { render: () => <Demo initial="open" /> }

/** Two options: the columns follow the option count. */
export const TwoOptions: Story = {
  render: () => {
    const [v, setV] = useState<'high' | 'low'>('high')
    return (
      <Segmented
        options={[
          { value: 'high', label: 'High wins' },
          { value: 'low', label: 'Low wins' },
        ]}
        value={v}
        onChange={setV}
        label="Who wins?"
      />
    )
  },
}
