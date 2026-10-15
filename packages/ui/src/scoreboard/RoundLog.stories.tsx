import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '../primitives/Button'
import { players, rounds, SAMPLES } from './fixtures'
import { RoundLog } from './RoundLog'

const three = players(3)
const ids = three.map((p) => p.id)

const meta: Meta<typeof RoundLog> = {
  title: 'Scoreboard/RoundLog',
  component: RoundLog,
  args: {
    players: three,
    rounds: rounds(ids, [
      [23, 41, 12],
      [0, 18, 33],
      [37, 37, 9],
      [15, 0, 44],
    ]),
    lowWins: false,
    editable: true,
  },
}
export default meta
type Story = StoryObj<typeof RoundLog>

/** In a live game: newest first, each row a button ("Edit round N") with a pencil. */
export const Editable: Story = {}
/** A finished game (Detail sheet): plain rows, no pencil. */
export const ReadOnly: Story = { args: { editable: false } }
/** A sample game straight from core `makeSamples`. */
export const SampleGame: Story = {
  args: {
    editable: false,
    rounds: SAMPLES[0]?.rounds ?? [],
  },
}
/** Blank scores show "–" and count as 0. */
export const Blanks: Story = {
  args: {
    rounds: rounds(ids, [
      [12, null, 30],
      [null, null, null],
      [8, 22, null],
    ]),
  },
}
/** Skull King-style negatives: the round's top is still the highest positive. */
export const NegativeScores: Story = {
  args: {
    rounds: rounds(ids, [
      [-20, 40, 10],
      [-10, -30, -20],
      [60, -10, 0],
    ]),
  },
}
/** Low score wins: the lowest in each round wears its colour. */
export const LowWins: Story = {
  args: {
    lowWins: true,
    rounds: rounds(ids, [
      [12, 4, 25],
      [0, 9, 3],
      [7, 7, 18],
    ]),
  },
}
export const SixPlayers: Story = {
  args: {
    players: players(6),
    rounds: rounds(
      players(6).map((p) => p.id),
      [
        [12, 30, 8, 22, 0, 15],
        [40, 5, 18, 9, 27, 33],
      ],
    ),
  },
}

/** Add a round: the newest row slides in with a jade flash (`freshKey`). */
export const FreshRow: Story = {
  render: function Render(args) {
    const [list, setList] = useState(args.rounds)
    const [k, setK] = useState<number | null>(null)
    const [edited, setEdited] = useState<number | null>(null)
    return (
      <div className="flex flex-col gap-3">
        <Button
          icon="check"
          onClick={() => {
            setList((l) => [...l, ...rounds(ids, [ids.map(() => Math.round(Math.random() * 45))])])
            setK((x) => (x ?? 0) + 1)
          }}
        >
          Score a round
        </Button>
        <RoundLog {...args} rounds={list} freshKey={k} onEdit={setEdited} />
        <p className="hint" style={{ margin: 0 }}>
          {edited == null ? 'Tap a row to edit it.' : `onEdit(${edited})`}
        </p>
      </div>
    )
  },
}
