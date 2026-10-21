import type { Meta, StoryObj } from '@storybook/react'
import { SAMPLES, staffFor } from './fixtures'
import { SongStrip } from './SongStrip'

const game = SAMPLES[2]!

const meta: Meta<typeof SongStrip> = {
  title: 'Scoreboard/SongStrip',
  component: SongStrip,
  args: {
    title: 'The fox trot so far',
    caption: "Each round adds a step in the round winner's color",
    song: staffFor(game),
    onPlay: () => {},
    label: `Play ${game.name} fox trot`,
  },
  argTypes: {
    pulse: { control: { type: 'range', min: -1, max: 12, step: 1 } },
    highlight: { control: { type: 'range', min: 0, max: 12, step: 1 } },
  },
}
export default meta
type Story = StoryObj<typeof SongStrip>

/** The game screen: the song so far, tap to hear it. */
export const SoFar: Story = {}
/** The game screen: a shorter staff, the title gone once there are notes (scoring stays in reach). */
export const Compact: Story = { args: { compact: true } }
/** Before the first round: the caption, not an empty staff. */
export const NoRoundsYet: Story = {
  args: { song: staffFor({ ...game, completedAt: null, winnerId: null, rounds: [] }) },
}
/** Playing: the playhead steps through, the glyph turns to stop. */
export const Playing: Story = {
  args: { playing: true, pulse: 2, label: `Stop ${game.name} fox trot` },
}
/** Edit round: the round being edited is marked; the strip plays just that round. */
export const EditRound: Story = { args: { title: undefined, highlight: 1, label: 'Hear it' } }
/** The victory overlay: no card behind it. */
export const Bare: Story = { args: { title: undefined, bare: true, label: 'Replay the fox trot' } }
