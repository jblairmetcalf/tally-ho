import type { Meta, StoryObj } from '@storybook/react'
import { rng } from '@tally/core'
import { rounds, SAMPLES, staffFor } from './fixtures'
import { Staff } from './Staff'

const game = SAMPLES[0]!
const ids = game.playerIds
const r = rng(11)
/** A long game: twenty rounds of made-up scores. */
const long = {
  ...game,
  rounds: rounds(
    ids,
    Array.from({ length: 20 }, () => ids.map(() => Math.floor(r() * 4) * Math.floor(r() * 25))),
  ),
}
const song = staffFor(game)

const meta: Meta<typeof Staff> = {
  title: 'Scoreboard/Staff',
  component: Staff,
  args: { notes: song.notes, length: song.length, label: `${game.name} fox trot` },
  argTypes: {
    size: { control: 'inline-radio', options: ['full', 'mini'] },
    pulse: { control: { type: 'range', min: -1, max: 12, step: 1 } },
    highlight: { control: { type: 'range', min: -1, max: 12, step: 1 } },
  },
}
export default meta
type Story = StoryObj<typeof Staff>

/** A finished game's fox trot, every note placed by time and pitch: the riff in ink, each round in its singer's colour, the bass small underneath, the coda in the winner's colours. */
export const Song: Story = {}
/** Playing: each note lights up while it sounds (press play in the app; here, round three's notes lit). */
export const Lit: Story = { args: { pulse: 2 } }
/** Edit round: the round being edited is ringed in amber. */
export const Editing: Story = { args: { highlight: 1 } }
/** The first round of a game: the riff, then one round. */
export const OneRound: Story = {
  args: (() => {
    const s = staffFor({
      ...game,
      completedAt: null,
      winnerId: null,
      rounds: game.rounds.slice(0, 1),
    })
    return { notes: s.notes, length: s.length }
  })(),
}
/** Ties sing a chord; a round nobody scored is only its bass. */
export const TiesAndRests: Story = {
  args: (() => {
    const s = staffFor({
      ...game,
      rounds: rounds(ids, [ids.map(() => 8), ids.map(() => 0), ids.map((_, i) => (i ? 3 : 12))]),
    })
    return { notes: s.notes, length: s.length }
  })(),
}
/** Twenty rounds: it scrolls sideways rather than crowd its notes. */
export const TwentyRounds: Story = {
  args: (() => {
    const s = staffFor(long)
    return { notes: s.notes, length: s.length }
  })(),
}
/** The song card's size. */
export const Mini: Story = { args: { size: 'mini', label: undefined } }
