import type { Meta, StoryObj } from '@storybook/react'
import { STICKERS } from '@tally/core'
import { ICONS, type IconName } from './Icon'
import { Sticker } from './Sticker'

/** Sample names for the stories (the app's words live in its copy). */
const NAMES: Record<string, string> = {
  crown: 'First Crown',
  hat: 'Hat Trick',
  comeback: 'Comeback Kid',
  wire: 'Wire to Wire',
  photo: 'Photo Finish',
  steam: 'Steamroller',
  bust: 'Big Fat Zero',
  marathon: 'Marathon',
  polymath: 'Polymath',
  ten: 'Double Digits',
  owl: 'Night Owl',
  underdog: 'Underdog',
}

const meta: Meta<typeof Sticker> = {
  title: 'Brand/Sticker',
  component: Sticker,
  args: { label: 'Hat Trick', tone: 'fox', icon: 'flame', shape: 'burst', size: 72, tilt: -4 },
  argTypes: {
    tone: { control: 'inline-radio', options: ['amber', 'fox', 'jade', 'lav', 'coral', 'sky'] },
    icon: { control: 'select', options: Object.keys(ICONS) },
    shape: { control: 'inline-radio', options: ['circle', 'burst', 'hex', 'square'] },
    size: { control: { type: 'range', min: 32, max: 120, step: 2 } },
    tilt: { control: { type: 'range', min: -12, max: 12, step: 1 } },
    count: { control: { type: 'range', min: 0, max: 9, step: 1 } },
  },
}
export default meta
type Story = StoryObj<typeof Sticker>

/** One earned sticker: a die-cut shape with a white border and a soft shadow. */
export const Earned: Story = {}
/** Earned more than once: the ×N badge. */
export const Repeats: Story = { args: { count: 3 } }
/** Not earned yet: a dashed outline of the same shape, glyph faint. */
export const Locked: Story = { args: { locked: true, label: 'Hat Trick, locked' } }
/** Earned twice, locked: the ×N badge never shows on a locked one. */
export const LockedWithCount: Story = {
  args: { locked: true, count: 2, label: 'Hat Trick, not yet' },
}
/** Inside a control that's already named (a shelf button): no label, so it's decorative. */
export const Decorative: Story = { args: { label: undefined } }
/** All twelve in album order, alternating tilt. */
export const AllTwelve: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4" style={{ padding: 8 }}>
      {STICKERS.map((s, i) => (
        <Sticker
          key={s.id}
          label={NAMES[s.id] ?? s.id}
          tone={s.tone}
          icon={s.icon as IconName}
          shape={s.shape}
          size={64}
          tilt={((i * 37) % 11) - 5}
        />
      ))}
    </div>
  ),
}
/** The same sticker small (Home's strip, game details) and large (the victory pack). */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-4">
      <Sticker {...args} size={44} />
      <Sticker {...args} size={66} />
      <Sticker {...args} size={88} />
    </div>
  ),
}
