import type { Meta, StoryObj } from '@storybook/react'
import { ICONS, type IconName } from '../brand/Icon'
import { LinkRow } from './LinkRow'

const meta: Meta<typeof LinkRow> = {
  title: 'Primitives/LinkRow',
  component: LinkRow,
  args: {
    icon: 'phone',
    tone: 'jade',
    title: 'Install on your phone',
    hint: 'Works offline, full-screen',
  },
  argTypes: {
    icon: { control: 'select', options: Object.keys(ICONS) as IconName[] },
    tone: { control: 'inline-radio', options: ['jade', 'amber', 'fox', 'coral', 'lav'] },
    onClick: { action: 'open' },
  },
}
export default meta
type Story = StoryObj<typeof LinkRow>

/** One row: tile, title, hint, chevron. 60px tall. */
export const Default: Story = {}

/** No hint: the title centres in the row. */
export const TitleOnly: Story = {
  args: { hint: undefined, icon: 'share', tone: 'amber', title: 'Share Tally Ho!' },
}

/** A long title and hint wrap at 320 rather than run under the chevron. */
export const LongText: Story = {
  args: {
    icon: 'heart',
    tone: 'coral',
    title: 'Say hi to the maker of this delightful little scorekeeper',
    hint: 'Blair Metcalf, who built it for family game night at the kitchen table',
  },
}

/** The Settings landing: three rows, three jewels. */
export const SettingsMenu: Story = {
  render: () => (
    <div className="flex flex-col gap-2.5">
      <LinkRow
        icon="phone"
        tone="jade"
        title="Install on your phone"
        hint="Works offline, full-screen"
      />
      <LinkRow icon="share" tone="amber" title="Share Tally Ho!" hint="Show a QR code" />
      <LinkRow icon="heart" tone="coral" title="Say hi to the maker" hint="Blair Metcalf" />
    </div>
  ),
}

/** Every tone, for the palette check in both themes. */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-2.5">
      {(['jade', 'amber', 'fox', 'coral', 'lav'] as const).map((t) => (
        <LinkRow key={t} icon="link" tone={t} title={`Tone: ${t}`} hint="The tile's fill" />
      ))}
    </div>
  ),
}
