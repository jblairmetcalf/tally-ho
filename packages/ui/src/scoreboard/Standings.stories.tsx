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
/** After the last game: Blair climbed two places (▲2), Kate and Alder slipped one each (▼). */
export const Movement: Story = {
  args: {
    rows: [
      { id: 'blair', name: 'Blair', color: 1, wins: 4, played: 8, move: 2 },
      { id: 'kate', name: 'Kate', color: 0, wins: 3, played: 8, move: -1 },
      { id: 'alder', name: 'Alder', color: 2, wins: 2, played: 8, move: -1 },
      { id: 'rowan', name: 'Rowan', color: 3, wins: 1, played: 4 },
    ],
    moveLabel: (n: number) => `${n > 0 ? 'Up' : 'Down'} ${Math.abs(n)} since the last game`,
  },
}
/** With the Sticker Club: each name has its tally underneath, and every row opens a sticker book. */
export const WithStickers: Story = {
  args: {
    subOf: (id: string) =>
      ({
        kate: '5 stickers · 7 to go',
        blair: '2 stickers · 10 to go',
        alder: '9 stickers · 3 to go',
      })[id],
    onPick: () => {},
    pickLabel: (id: string) => `${id}: open sticker book`,
    hint: 'Tap a name for their stickers',
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
