import type { Meta, StoryObj } from '@storybook/react'
import { byId, stats } from './fixtures'
import { StatList } from './StatList'

const s = stats()

const meta: Meta<typeof StatList> = {
  title: 'Scoreboard/StatList',
  component: StatList,
}
export default meta
type Story = StoryObj<typeof StatList>

/** Home's "By the numbers" card from the core sample history. */
export const Home: Story = {
  args: {
    title: 'By the numbers',
    rows: [
      { label: 'Games played', value: s.total },
      {
        label: 'Longest streak',
        value: s.best.n,
        detail: s.best.id ? byId(s.best.id).name : undefined,
      },
      {
        label: 'Biggest round',
        value: s.big ? s.big.v : '–',
        detail: s.big ? `${byId(s.big.id).name}, ${s.big.game}` : undefined,
      },
      {
        label: 'Most played',
        value: s.fav ? s.fav.count : '–',
        detail: s.fav?.name,
      },
    ],
  },
}

/** Early days: one game, no streak or big round yet, so values fall back to a dash. */
export const Sparse: Story = {
  args: {
    title: 'By the numbers',
    rows: [
      { label: 'Games played', value: 1 },
      { label: 'Longest streak', value: 1, detail: 'Kate' },
      { label: 'Biggest round', value: '–' },
      { label: 'Most played', value: 1, detail: 'Flip 7' },
    ],
  },
}

/** Long names wrap onto their own line instead of pushing the label off the card. */
export const LongNames: Story = {
  args: {
    title: 'By the numbers',
    rows: [
      { label: 'Games played', value: 128 },
      { label: 'Longest streak', value: 12, detail: 'Bartholomew' },
      { label: 'Biggest round', value: 1250, detail: 'Bartholomew, Ticket to Ride Europe' },
      { label: 'Most played', value: 48, detail: 'Ticket to Ride Europe' },
    ],
  },
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <StatList {...args} />
    </div>
  ),
}
