import type { Meta, StoryObj } from '@storybook/react'
import { chartSeries, SAMPLES } from './fixtures'
import { WinsChart } from './WinsChart'

const meta: Meta<typeof WinsChart> = {
  title: 'Scoreboard/WinsChart',
  component: WinsChart,
  args: { series: chartSeries() },
  render: (args) => (
    <section className="card">
      <h2 className="sec" style={{ marginBottom: 10 }}>
        Who's winning over time
      </h2>
      <WinsChart {...args} />
    </section>
  ),
}
export default meta
type Story = StoryObj<typeof WinsChart>

/** The ten core sample games (`makeSamples` → `winSeries`). Lines draw in one after another. */
export const FromSamples: Story = {}
/** The minimum: two games. */
export const TwoGames: Story = { args: { series: chartSeries(SAMPLES.slice(0, 2)) } }
/** Close finishing values: the end labels push apart so they never overlap. */
export const LabelCollision: Story = {
  args: {
    series: [
      { id: 'kate', name: 'Kate', color: 0, pts: [0, 1, 1, 2, 2, 3, 3] },
      { id: 'blair', name: 'Blair', color: 1, pts: [0, 0, 1, 1, 2, 2, 3] },
      { id: 'alder', name: 'Alder', color: 2, pts: [0, 0, 0, 1, 1, 2, 3] },
      { id: 'rowan', name: 'Rowan', color: 6, pts: [0, 0, 0, 0, 1, 1, 2] },
    ],
  },
}
/** One game is not a trend: renders nothing. */
export const OneGame: Story = { args: { series: chartSeries(SAMPLES.slice(0, 1)) } }
