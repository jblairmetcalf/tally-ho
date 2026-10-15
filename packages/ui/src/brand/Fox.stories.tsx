import type { Meta, StoryObj } from '@storybook/react'
import { Fox } from './Fox'

const meta: Meta<typeof Fox> = {
  title: 'Brand/Fox',
  component: Fox,
  render: (args) => (
    <div className="badge" style={{ width: 160, height: 160 }}>
      <Fox {...args} className="h-[136px] w-[136px]" />
    </div>
  ),
}
export default meta
type Story = StoryObj<typeof Fox>

/** Blinks every 4.6 s. */
export const Idle: Story = {}
/** The champion's fox: the crown drops in with a spring. */
export const Crowned: Story = { args: { crown: true } }
/** Victory: crowned, with a wink. */
export const Winking: Story = { args: { crown: true, wink: true } }
/** The FAB fox twitches its ears after every scored round. */
export const Twitch: Story = { args: { twitch: true } }
