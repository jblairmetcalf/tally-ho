import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = { title: 'Brand/Badge', component: Badge }
export default meta
type Story = StoryObj<typeof Badge>

/** The 62px ink disc with the fox and a jade ring. Spins in with `badgeIn`. */
export const Default: Story = {}
export const Crowned: Story = { args: { crown: true } }
export const Winking: Story = { args: { crown: true, wink: true } }
