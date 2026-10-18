import type { Meta, StoryObj } from '@storybook/react'
import { FoxNote } from './FoxNote'

const meta: Meta<typeof FoxNote> = {
  title: 'Brand/FoxNote',
  component: FoxNote,
  args: {
    title: 'Made by Blair Metcalf',
    body: 'Built for family game night. Say hi, share an idea, or tell me what broke.',
    layout: 'center',
  },
  argTypes: { layout: { control: 'inline-radio', options: ['row', 'center'] } },
}
export default meta
type Story = StoryObj<typeof FoxNote>

/** A sheet's hero: the badge above, the words centred. */
export const Center: Story = {}

/** Beside the words: the Settings landing's opening line. */
export const Row: Story = {
  args: {
    layout: 'row',
    title: 'Hi there!',
    body: 'Keep score, share the fun, and make it yours.',
  },
}

/** Just a headline. */
export const TitleOnly: Story = { args: { body: undefined, title: "You're all set" } }

/** The fox winks as it spins in. */
export const Wink: Story = { args: { wink: true } }
