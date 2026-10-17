import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Chip } from '../brand/Chip'
import { SFX } from '../feel/sfx'
import { Button } from './Button'
import { Eyebrow } from './Card'
import { ConfirmButton } from './ConfirmButton'
import { Pill, PillRow } from './Pill'
import { Segmented } from './Segmented'
import { Sheet, SheetTitle } from './Sheet'
import { TextInput } from './TextInput'

const meta: Meta<typeof Sheet> = {
  title: 'Primitives/Sheet',
  component: Sheet,
  parameters: { tally: { overlay: true } },
}
export default meta
type Story = StoryObj<typeof Sheet>

function Body({ close }: { close: () => void }) {
  const [game, setGame] = useState('Rummy')
  const [goal, setGoal] = useState<'score' | 'rounds' | 'open'>('score')
  return (
    <>
      <SheetTitle title="New game" onClose={close} />
      <div className="group">
        <Eyebrow>What are we playing?</Eyebrow>
        <PillRow label="Game">
          {['Rummy', 'Hearts', 'Yahtzee', 'Uno'].map((g) => (
            <Pill key={g} on={game === g} onClick={() => setGame(g)}>
              {g}
            </Pill>
          ))}
        </PillRow>
      </div>
      <div className="group">
        <Eyebrow>How does it end?</Eyebrow>
        <Segmented
          label="How does it end?"
          value={goal}
          onChange={setGoal}
          options={[
            { value: 'score', label: 'Score target' },
            { value: 'rounds', label: 'Rounds' },
            { value: 'open', label: 'Open-ended' },
          ]}
        />
      </div>
      <div className="group">
        <Eyebrow>Players</Eyebrow>
        {['Ana', 'Ben', 'Cleo'].map((p, i) => (
          <div key={p} className="player-line">
            <Chip name={p} color={i} size={34} />
            <span className="n">{p}</span>
          </div>
        ))}
        <TextInput placeholder="Add a player" aria-label="Add a player" />
      </div>
      <Button variant="amber" block onClick={close}>
        Deal in · {game}
      </Button>
      <ConfirmButton
        label="Discard this game"
        armedLabel="Tap again to discard"
        onArm={() => SFX.error()}
        onConfirm={close}
      />
    </>
  )
}

function Demo({ initial }: { initial: boolean }) {
  const [open, setOpen] = useState(initial)
  const close = () => {
    SFX.close()
    setOpen(false)
  }
  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>
        Drag the grab handle down past 100px to dismiss, or press Escape, or tap the backdrop.
      </p>
      <Button
        onClick={() => {
          SFX.open()
          setOpen(true)
        }}
      >
        Open sheet
      </Button>
      <Sheet open={open} onClose={close} label="New game">
        <Body close={close} />
      </Sheet>
    </>
  )
}

/** Closed until you press the button. Slides up on `sheetIn`; leaves on `.closing` (290 ms). */
export const WithTrigger: Story = { render: () => <Demo initial={false} /> }

/** Open on load. */
export const Open: Story = { render: () => <Demo initial /> }

/** A short sheet: only the title row and one action. */
export const Short: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open sheet</Button>
        <Sheet open={open} onClose={() => setOpen(false)} label="End game">
          <SheetTitle title="End the game?" onClose={() => setOpen(false)} />
          <p className="hint" style={{ margin: 0 }}>
            Ana is ahead. Crown her now, or keep playing.
          </p>
          <Button block icon="flag" onClick={() => setOpen(false)}>
            Crown Ana
          </Button>
        </Sheet>
      </>
    )
  },
}

function NestedDemo() {
  const [open, setOpen] = useState(true)
  const [edit, setEdit] = useState(true)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open sheet</Button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Settings">
        <SheetTitle title="Settings" onClose={() => setOpen(false)} />
        <div className="group">
          {['Ana', 'Ben', 'Cleo'].map((p, i) => (
            <div key={p} className="player-line">
              <Chip name={p} color={i} size={34} />
              <span className="n">{p}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-haspopup="dialog"
                onClick={() => setEdit(true)}
              >
                Edit
              </Button>
            </div>
          ))}
        </div>
        <Sheet open={edit} onClose={() => setEdit(false)} label="Edit Ana">
          <SheetTitle title="Edit Ana" onClose={() => setEdit(false)} />
          <TextInput aria-label="Ana's name" defaultValue="Ana" />
          <ConfirmButton
            label="Archive player"
            armedLabel="Tap again to archive"
            onArm={() => SFX.error()}
            onConfirm={() => setEdit(false)}
          />
        </Sheet>
      </Sheet>
    </>
  )
}

/**
 * A sheet opened from inside another stacks above it with its own backdrop, a little shorter so
 * the one beneath peeks out. Escape, a backdrop tap or a drag closes only the top sheet, and
 * focus goes back to the button that opened it.
 */
export const Nested: Story = { render: () => <NestedDemo /> }
