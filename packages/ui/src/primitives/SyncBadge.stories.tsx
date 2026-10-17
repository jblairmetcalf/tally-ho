import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Badge } from '../brand/Badge'
import { SYNC_LABELS, SyncBadge, type SyncBadgeState } from './SyncBadge'
import { Toast } from './Toast'

const meta: Meta<typeof SyncBadge> = {
  title: 'Primitives/SyncBadge',
  component: SyncBadge,
  args: { state: 'synced' },
}
export default meta
type Story = StoryObj<typeof SyncBadge>

/** Everything is on the family record: a quiet jade cloud. */
export const Synced: Story = {}
/** Saved on this phone, on its way up: a pulsing amber dot. */
export const Pending: Story = { args: { state: 'pending' } }
/** No signal: the cloud is crossed out. Scores still save on this phone. */
export const Offline: Story = { args: { state: 'offline' } }
/** Something went wrong syncing: a coral dot. */
export const ErrorState: Story = { name: 'Error', args: { state: 'error' } }

/** `compact`: pinned to the fox badge's corner in the home header (44px hit area). */
export const Compact: Story = {
  args: { state: 'pending', compact: true },
  render: (args) => (
    <div className="flex gap-6">
      <div className="badge-slot">
        <Badge />
        <SyncBadge {...args} />
      </div>
      <div className="badge-slot">
        <Badge />
        <SyncBadge {...args} state="offline" />
      </div>
    </div>
  ),
}

const STATES = Object.keys(SYNC_LABELS) as SyncBadgeState[]

/** Every state; tap one to see the label it announces (the app shows it as a toast). */
export const AllStates: Story = {
  render: function Render() {
    const [said, setSaid] = useState<{ msg: string; k: number } | null>(null)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {STATES.map((s) => (
            <SyncBadge
              key={s}
              state={s}
              onClick={(msg) => setSaid({ msg, k: (said?.k ?? 0) + 1 })}
            />
          ))}
        </div>
        {said && <Toast key={said.k} message={said.msg} icon="check" placement="inline" />}
      </div>
    )
  },
}
