import type { Meta, StoryObj } from '@storybook/react'
import { ChampionCard } from './ChampionCard'
import { byId, stats } from './fixtures'

const s = stats()
const top = s.standings[0]
const leaders = s.standings
  .filter((x) => x.wins === top?.wins)
  .map((x) => ({ name: byId(x.id).name, color: byId(x.id).color }))

const meta: Meta<typeof ChampionCard> = {
  title: 'Scoreboard/ChampionCard',
  component: ChampionCard,
  args: { leaders: [{ name: 'Kate', color: 0 }], wins: 4, total: 10, streak: null },
}
export default meta
type Story = StoryObj<typeof ChampionCard>

export const Single: Story = {}
/** From the core sample history via `computeStats`. */
export const FromSamples: Story = {
  args: {
    leaders,
    wins: top?.wins ?? 0,
    total: s.total,
    streak: s.current.id ? { name: byId(s.current.id).name, n: s.current.n } : null,
  },
}
/** Tied on wins: an "=" chip, "Dead heat", the names joined with " & ". */
export const DeadHeat: Story = {
  args: {
    leaders: [
      { name: 'Kate', color: 0 },
      { name: 'Blair', color: 1 },
    ],
  },
}
export const ThreeWayHeat: Story = {
  args: {
    leaders: [
      { name: 'Kate', color: 0 },
      { name: 'Blair', color: 1 },
      { name: 'Alder', color: 2 },
    ],
    wins: 3,
    total: 9,
  },
}
/** Two or more in a row: the flickering coral streak badge. */
export const WithStreak: Story = { args: { streak: { name: 'Kate', n: 3 } } }
