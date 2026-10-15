import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Badge } from './Badge'
import { Wordmark } from './Wordmark'

const meta: Meta<typeof Wordmark> = { title: 'Brand/Wordmark', component: Wordmark }
export default meta
type Story = StoryObj<typeof Wordmark>

/** Each letter drops in on the spring, 55 ms apart, tilted alternately. Press to replay. */
export const Default: Story = {
  render: () => {
    const [k, setK] = useState(0)
    return (
      <div className="flex flex-col items-start gap-3">
        <Wordmark key={k} />
        <button type="button" className="link" onClick={() => setK((x) => x + 1)}>
          Replay
        </button>
      </div>
    )
  },
}

/** With the badge: the app's header. */
export const Header: Story = {
  render: () => (
    <header className="topbar">
      <Badge />
      <Wordmark />
    </header>
  ),
}
