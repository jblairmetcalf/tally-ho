import type { Meta, StoryObj } from '@storybook/react'
import { byId, stats } from './fixtures'
import { Standings } from './Standings'

const rows = stats().standings.map((x) => ({ ...byId(x.id), ...x }))

const meta: Meta<typeof Standings> = {
  title: 'Scoreboard/Standings',
  component: Standings,
  args: { rows },
}
export default meta
type Story = StoryObj<typeof Standings>

/** The core sample history: bars grow in one after another. */
export const FromSamples: Story = {}
export const Tied: Story = {
  args: {
    rows: [
      { id: 'kate', name: 'Kate', color: 0, wins: 3, played: 6 },
      { id: 'blair', name: 'Blair', color: 1, wins: 3, played: 6 },
    ],
  },
}
/** Nobody has a win yet: empty bars, 0%. */
export const NoWins: Story = {
  args: {
    rows: [
      { id: 'kate', name: 'Kate', color: 0, wins: 0, played: 0 },
      { id: 'blair', name: 'Blair', color: 1, wins: 0, played: 0 },
    ],
  },
}
export const SixPlayers: Story = {
  args: {
    rows: [
      { id: 'kate', name: 'Kate', color: 0, wins: 9, played: 20 },
      { id: 'blair', name: 'Blair', color: 1, wins: 5, played: 18 },
      { id: 'alder', name: 'Alder', color: 2, wins: 3, played: 20 },
      { id: 'rowan', name: 'Rowan', color: 3, wins: 2, played: 7 },
      { id: 'mags', name: 'Mags', color: 4, wins: 1, played: 9 },
      { id: 'theo', name: 'Theodora-Lynn', color: 5, wins: 0, played: 4 },
    ],
  },
}
