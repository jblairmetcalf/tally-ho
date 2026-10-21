import type { Meta, StoryObj } from '@storybook/react'
import art from '../../../../apps/web/public/splash-art.webp'
import { Splash } from './Splash'

const meta: Meta<typeof Splash> = {
  title: 'Brand/Splash',
  component: Splash,
  tags: ['!autodocs'],
  parameters: { tally: { overlay: true } },
  args: {
    art,
    tagline: 'Good cards. Better company.',
    loading: 'Loading…',
    label: 'Loading Tally Ho!',
  },
}
export default meta
type Story = StoryObj<typeof Splash>

/** Launch: the art, the tagline rising, the bar filling (at least two seconds, then it fades). */
export const Loading: Story = {}
/** Leaving: it fades into the app. */
export const Leaving: Story = { args: { out: true } }
