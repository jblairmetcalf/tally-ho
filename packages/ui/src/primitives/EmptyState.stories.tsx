import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'Primitives/EmptyState',
  component: EmptyState,
  args: { title: 'No games yet', body: 'Finished games land here.' },
}
export default meta
type Story = StoryObj<typeof EmptyState>

/** Home, first launch: the crowned fox and a call to action. */
export const Home: Story = {
  args: {
    crown: true,
    body: 'Deal the first hand and the leaderboard starts here.',
    action: <Button icon="plus">New game</Button>,
  },
}
/** History with nothing finished. */
export const History: Story = {}
/** History with filters that match nothing. */
export const NoMatches: Story = {
  args: { title: 'Nothing matches', body: 'Try a different game or winner.' },
}
