import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from './Button'
import { Toast } from './Toast'

const meta: Meta<typeof Toast> = {
  title: 'Primitives/Toast',
  tags: ['!autodocs'],
  component: Toast,
  args: { message: 'Ana takes the lead', placement: 'inline' },
  argTypes: {
    placement: { control: 'inline-radio', options: ['nav', 'bottom', 'inline'] },
    icon: { control: 'select', options: ['crown', 'check', 'trash', 'flame', 'bolt'] },
  },
}
export default meta
type Story = StoryObj<typeof Toast>

/** In flow, so it sits in the column. Cream on dark, ink on Daylight. */
export const Inline: Story = {}
export const MatchPoint: Story = {
  args: { message: 'Ben & Cleo are at match point', icon: 'flame' },
}
export const Deleted: Story = { args: { message: 'Round 2 deleted', icon: 'trash' } }

function Live({ placement }: { placement: 'nav' | 'bottom' }) {
  const [k, setK] = useState<number | null>(Date.now())
  return (
    <>
      <Button onClick={() => setK(Date.now())}>Show toast</Button>
      {k != null && (
        <Toast key={k} message="Samples cleared. This one counts." placement={placement} />
      )}
    </>
  )
}

/** Fixed above the bottom nav, popping up with `toastIn`. Press to replay. */
export const AboveNav: Story = {
  parameters: { tally: { overlay: true } },
  render: () => <Live placement="nav" />,
}
/** In a game there is no nav: it sits at the bottom edge. */
export const AtBottom: Story = {
  parameters: { tally: { overlay: true } },
  render: () => <Live placement="bottom" />,
}
