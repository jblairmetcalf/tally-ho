import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Chip } from '../brand/Chip'
import { SFX } from '../feel/sfx'
import { Button } from './Button'
import { ConfirmButton } from './ConfirmButton'
import { IconButton } from './IconButton'
import { LinkRow } from './LinkRow'
import { Sheet } from './Sheet'
import { SheetNav, type SheetNavPage } from './SheetNav'
import { Swatches } from './Swatches'
import { TextInput } from './TextInput'

const meta: Meta<typeof SheetNav> = {
  title: 'Primitives/SheetNav',
  tags: ['!autodocs'],
  component: SheetNav,
  parameters: { tally: { overlay: true } },
}
export default meta
type Story = StoryObj<typeof SheetNav>

const PLAYERS = ['Ana', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fern', 'Gus', 'Hana']

type Route = 'root' | 'players' | `edit:${string}`

function Demo({ initial, reduced = false }: { initial: Route[]; reduced?: boolean }) {
  const [open, setOpen] = useState(true)
  const [stack, setStack] = useState<Route[]>(initial)
  const push = (r: Route) => {
    SFX.open()
    setStack((s) => [...s, r])
  }
  const back = () => {
    SFX.close()
    setStack((s) => s.slice(0, -1))
  }
  const close = () => {
    SFX.close()
    setOpen(false)
  }
  const page = (r: Route): SheetNavPage => {
    if (r === 'root')
      return {
        key: r,
        title: 'Settings',
        content: (
          <>
            <p className="hint" style={{ margin: 0 }}>
              Push a page: it slides in from the right. Back (or Escape) slides it away; Close, a
              backdrop tap or a drag on the handle closes the whole sheet from any page.
            </p>
            <LinkRow
              icon="users"
              tone="fox"
              title="Players"
              hint="Ana, Ben, Cleo +5"
              onClick={() => push('players')}
            />
          </>
        ),
      }
    if (r === 'players')
      return {
        key: r,
        title: 'Players',
        content: (
          <>
            <div className="group">
              {PLAYERS.map((p, i) => (
                <div key={p} className="player-line">
                  <Chip name={p} color={i} size={34} />
                  <span className="n">{p}</span>
                  <IconButton icon="pencil" label={`Edit ${p}`} onClick={() => push(`edit:${p}`)} />
                </div>
              ))}
            </div>
            <div className="sheet-cta">
              <Button block icon="plus" iconSize={20}>
                Add a player
              </Button>
            </div>
          </>
        ),
      }
    const name = r.slice(5)
    return {
      key: r,
      title: `Edit ${name}`,
      content: (
        <>
          <div className="group">
            <TextInput aria-label={`${name}'s name`} defaultValue={name} />
            <Swatches
              label={`${name}'s colour`}
              value={PLAYERS.indexOf(name)}
              taken={[]}
              onChange={() => {}}
            />
          </div>
          <ConfirmButton
            label="Archive player"
            armedLabel="Tap again to archive"
            icon="trash"
            onArm={() => SFX.error()}
            onConfirm={back}
          />
        </>
      ),
    }
  }
  return (
    <>
      {/* Story-only stand-in for the OS setting: what motion.css's kill switch does to a page.
          Unlayered, so it wins over the components layer without !important. */}
      {reduced && <style>{'.sheet-page { animation-duration: 0.001ms; }'}</style>}
      <Button
        onClick={() => {
          setStack(initial)
          setOpen(true)
        }}
      >
        Open sheet
      </Button>
      <Sheet open={open} onClose={close} label="Settings" nav>
        <SheetNav
          pages={stack.map(page)}
          onBack={back}
          onClose={close}
          backLabel="Back"
          closeLabel="Close"
        />
      </Sheet>
    </>
  )
}

/** The root page: its title and the close button top right, no back button. */
export const Root: Story = { render: () => <Demo initial={['root']} /> }

/**
 * One deep (Settings › Players): a back button top left, the page's title (now the dialog's
 * name), close still top right, and the page's own pinned action at the bottom.
 */
export const OneDeep: Story = { render: () => <Demo initial={['root', 'players']} /> }

/**
 * Two deep (Settings › Players › Edit Ana). Back steps one page; Close leaves from here in one
 * tap. The pages beneath keep their scroll and state, hidden and inert until you come back.
 */
export const TwoDeep: Story = { render: () => <Demo initial={['root', 'players', 'edit:Ana']} /> }

/**
 * With reduced motion a push or a pop swaps the page instantly (no slide); focus still moves to
 * the new page's title and back to what pushed it.
 */
export const ReducedMotion: Story = { render: () => <Demo initial={['root']} reduced /> }

/** A long title (a long name) wraps to two lines beside back and close, then ellipsizes. */
export const LongTitle: Story = {
  render: () => <Demo initial={['root', 'players', 'edit:Bartholomew-Jnr']} />,
}
