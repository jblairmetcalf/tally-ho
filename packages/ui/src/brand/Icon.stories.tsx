import type { Meta, StoryObj } from '@storybook/react'
import { ICONS, Icon, type IconName } from './Icon'

const meta: Meta<typeof Icon> = {
  title: 'Brand/Icon',
  component: Icon,
  args: { name: 'crown', size: 22, stroke: 2.4 },
  argTypes: { name: { control: 'select', options: Object.keys(ICONS) } },
}
export default meta
type Story = StoryObj<typeof Icon>

export const Single: Story = {}

/** Every icon, with its name. 24×24 grid, round caps and joins, `currentColor`. */
export const All: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-2">
      {(Object.keys(ICONS) as IconName[]).map((n) => (
        <div key={n} className="card flex flex-col items-center gap-2" style={{ padding: 10 }}>
          <Icon name={n} size={26} />
          <span className="hint" style={{ fontSize: 11 }}>
            {n}
          </span>
        </div>
      ))}
    </div>
  ),
}
