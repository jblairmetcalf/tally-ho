import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SFX } from '../feel/sfx'
import { ConfirmButton } from './ConfirmButton'

const meta: Meta<typeof ConfirmButton> = {
  title: 'Primitives/ConfirmButton',
  component: ConfirmButton,
  args: { label: 'Delete this game', armedLabel: 'Tap again to delete' },
}
export default meta
type Story = StoryObj<typeof ConfirmButton>

function Demo(props: { label: string; armedLabel: string }) {
  const [n, setN] = useState(0)
  const [done, setDone] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      {done ? (
        <p className="hint">Deleted. (Reset to try again.)</p>
      ) : (
        <ConfirmButton
          key={n}
          {...props}
          onArm={() => SFX.error()}
          onConfirm={() => setDone(true)}
        />
      )}
      <button
        type="button"
        className="link"
        onClick={() => {
          setDone(false)
          setN((x) => x + 1)
        }}
      >
        Reset
      </button>
    </div>
  )
}

/** Tap once: it arms (coral fill + shake, `onArm` plays the error buzz). Tap again: confirmed. */
export const TwoTap: Story = { render: (args) => <Demo {...args} /> }

/** The round editor's wording. */
export const DeleteRound: Story = {
  args: { label: 'Delete round 3', armedLabel: 'Tap again to delete' },
  render: (args) => <Demo {...args} />,
}

/** Ending a game without a winner. */
export const Discard: Story = {
  args: { label: 'Discard this game', armedLabel: 'Tap again to discard' },
  render: (args) => <Demo {...args} />,
}
