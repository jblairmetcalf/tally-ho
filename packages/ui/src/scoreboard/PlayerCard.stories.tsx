import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '../primitives/Button'
import { PlayerCard } from './PlayerCard'

const meta: Meta<typeof PlayerCard> = {
  title: 'Scoreboard/PlayerCard',
  component: PlayerCard,
  args: { name: 'Kate', color: 0, total: 96, lead: false, near: null, sub: '104 to go' },
  render: (args) => (
    <div className="board" style={{ marginTop: 24, maxWidth: 140 }}>
      <PlayerCard {...args} />
    </div>
  ),
}
export default meta
type Story = StoryObj<typeof PlayerCard>

export const Normal: Story = {}
/** The single leader: amber border and total, crowned chip. */
export const Lead: Story = {
  args: { name: 'Blair', color: 1, total: 142, lead: true, sub: '58 to go', crownKey: 'blair' },
}
/** Within 15% of the target in a race. */
export const MatchPoint: Story = {
  args: { name: 'Alder', color: 2, total: 181, lead: true, near: 'match', sub: '19 to go' },
}
/** Low score wins, and this player is close to bust. */
export const Danger: Story = {
  args: { name: 'Mags', color: 4, total: 88, near: 'danger', sub: '12 to bust' },
}
/** Just scored: the card bumps and "+23" floats up. */
export const BumpPositive: Story = { args: { delta: 23, bumpKey: 1, sub: '+23 last round' } }
export const BumpNegative: Story = {
  args: { name: 'Rowan', color: 3, total: 40, delta: -10, bumpKey: 1, sub: '-10 last round' },
}
/** A zero round still bumps, without a float. */
export const BumpZero: Story = { args: { delta: 0, bumpKey: 1, sub: '0 last round' } }
export const LongName: Story = {
  args: { name: 'Bartholomew-Ann', color: 5, total: 1234, sub: '—' },
}

/** A whole board: score a round to see totals roll, cards bump and the crown move. */
export const Board: Story = {
  render: function Render() {
    const names = [
      { name: 'Kate', color: 0 },
      { name: 'Blair', color: 1 },
      { name: 'Alder', color: 2 },
    ]
    const [totals, setTotals] = useState([120, 135, 170])
    const [deltas, setDeltas] = useState<number[] | null>(null)
    const [k, setK] = useState(0)
    const target = 200
    const max = Math.max(...totals)
    const leaders = totals.filter((t) => t === max).length
    const score = () => {
      const d = totals.map(() => Math.round(Math.random() * 40) - 5)
      setDeltas(d)
      setTotals((t) => t.map((v, i) => v + (d[i] ?? 0)))
      setK((x) => x + 1)
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="board" style={{ marginTop: 24 }}>
          {names.map((p, i) => {
            const t = totals[i] ?? 0
            return (
              <PlayerCard
                key={p.name}
                {...p}
                total={t}
                lead={t === max && leaders === 1}
                near={t >= target * 0.85 && t < target ? 'match' : null}
                delta={deltas?.[i] ?? null}
                bumpKey={k}
                crownKey={`c${p.name}`}
                sub={t >= target ? 'Over the line' : `${target - t} to go`}
              />
            )
          })}
        </div>
        <Button onClick={score} icon="check">
          Score a round
        </Button>
        <Button variant="ghost" onClick={() => setTotals([120, 135, 170])}>
          Reset
        </Button>
      </div>
    )
  },
}
