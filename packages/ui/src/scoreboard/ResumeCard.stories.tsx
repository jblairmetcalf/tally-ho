import type { Meta, StoryObj } from '@storybook/react'
import { ResumeCard } from './ResumeCard'

const meta: Meta<typeof ResumeCard> = {
  title: 'Scoreboard/ResumeCard',
  component: ResumeCard,
  args: { name: 'Flip 7', sub: 'Round 4 · Race to 200' },
  argTypes: { onClick: { action: 'resume' } },
}
export default meta
type Story = StoryObj<typeof ResumeCard>

export const Default: Story = {}
export const LowWins: Story = { args: { name: 'Hearts', sub: 'Round 9 · Bust at 100' } }
export const LongName: Story = {
  args: { name: 'Settlers of the Very Long Board Game Name', sub: 'Round 12 · Open-ended' },
}
