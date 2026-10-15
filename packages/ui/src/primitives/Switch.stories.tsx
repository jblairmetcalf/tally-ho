import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Card } from './Card'
import { Segmented } from './Segmented'
import { Setting, Switch } from './Switch'

const meta: Meta<typeof Switch> = {
  title: 'Primitives/Switch',
  component: Switch,
  args: { label: 'Sound' },
}
export default meta
type Story = StoryObj<typeof Switch>

function Toggle({ initial, label }: { initial: boolean; label: string }) {
  const [on, setOn] = useState(initial)
  return <Switch checked={on} onChange={setOn} label={label} />
}

export const Off: Story = { render: (a) => <Toggle initial={false} label={a.label} /> }
/** The knob springs across and the track fills jade. */
export const On: Story = { render: (a) => <Toggle initial label={a.label} /> }

/** Rows of `Setting`, as on the settings sheet. */
export const SettingsList: Story = {
  render: () => {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')
    return (
      <Card>
        <Setting title="Sound" hint="Bleeps, bloops and the fanfare.">
          <Toggle initial label="Sound" />
        </Setting>
        <Setting title="Haptics" hint="A buzz when you score.">
          <Toggle initial={false} label="Haptics" />
        </Setting>
        <Setting title="Theme">
          <div style={{ width: 170 }}>
            <Segmented
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Daylight' },
              ]}
              value={theme}
              onChange={setTheme}
              label="Theme"
            />
          </div>
        </Setting>
        <Setting title="A row with only a title" />
      </Card>
    )
  },
}
