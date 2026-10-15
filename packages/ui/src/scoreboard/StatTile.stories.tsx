import type { Meta, StoryObj } from '@storybook/react'
import { byId, stats } from './fixtures'
import { StatTile } from './StatTile'

const s = stats()

const meta: Meta<typeof StatTile> = {
  title: 'Scoreboard/StatTile',
  component: StatTile,
  args: { icon: 'cards', tone: 'jade', value: 10, label: 'Games played' },
  render: (args) => (
    <div className="stats">
      <StatTile {...args} />
    </div>
  ),
}
export default meta
type Story = StoryObj<typeof StatTile>

export const Jade: Story = {}
export const Coral: Story = {
  args: { icon: 'flame', tone: 'coral', value: 3, label: 'Longest streak · Kate' },
}
export const Amber: Story = {
  args: { icon: 'bolt', tone: 'amber', value: 52, label: 'Biggest round · Blair, Flip 7' },
}
/** A word value: smaller and single-line. */
export const LavCompact: Story = {
  args: {
    icon: 'trophy',
    tone: 'lav',
    value: 'Skull King',
    label: 'Most played · 6 games',
    compact: true,
  },
}

/** Home's four tiles from the core sample history. */
export const HomeGrid: Story = {
  render: () => (
    <section className="stats">
      <StatTile icon="cards" tone="jade" value={s.total} label="Games played" />
      <StatTile
        icon="flame"
        tone="coral"
        value={s.best.n}
        label={`Longest streak · ${s.best.id ? byId(s.best.id).name : '–'}`}
      />
      <StatTile
        icon="bolt"
        tone="amber"
        value={s.big ? s.big.v : '–'}
        label={s.big ? `Biggest round · ${byId(s.big.id).name}, ${s.big.game}` : 'Biggest round'}
      />
      <StatTile
        icon="trophy"
        tone="lav"
        compact
        value={s.fav ? s.fav.name : '–'}
        label={`Most played · ${s.fav ? `${s.fav.count} games` : ''}`}
      />
    </section>
  ),
}
