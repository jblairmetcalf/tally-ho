import type { Meta, StoryObj } from '@storybook/react'
import { StickerPack } from './StickerPack'

const items = [
  { key: 'w', name: 'Flip 7', who: 'Kate', color: 0 },
  {
    key: 'a',
    name: 'Hat Trick',
    who: 'Kate',
    isNew: true,
    sticker: { label: 'Hat Trick, Kate', tone: 'fox', icon: 'flame', shape: 'burst' },
  },
  {
    key: 'b',
    name: 'Photo Finish',
    who: 'Kate',
    sticker: { label: 'Photo Finish, Kate', tone: 'coral', icon: 'camera', shape: 'circle' },
  },
  {
    key: 'c',
    name: 'Big Fat Zero',
    who: 'Blair',
    isNew: true,
    sticker: { label: 'Big Fat Zero, Blair', tone: 'coral', icon: 'zero', shape: 'hex' },
  },
] as const

const meta: Meta<typeof StickerPack> = {
  title: 'Scoreboard/StickerPack',
  component: StickerPack,
  args: {
    items: [...items],
    open: false,
    shown: 0,
    onOpen: () => {},
    title: 'Game night pack',
    sub: '4 stickers inside',
    hint: 'Tap the pack to tear it open',
    openLabel: 'Tear open the sticker pack',
    winnerLabel: 'Winner',
    newLabel: 'new',
  },
  argTypes: { shown: { control: { type: 'range', min: 0, max: 4, step: 1 } } },
}
export default meta
type Story = StoryObj<typeof StickerPack>

/** Sealed: a foil pack with the crowned fox, waiting to be torn open. */
export const Sealed: Story = {}
/** Tearing open: the winner's chip and the first sticker have landed. */
export const Revealing: Story = { args: { open: true, shown: 2 } }
/** All out: the winner's chip, then every sticker the game gave out (firsts tagged "new"). */
export const Revealed: Story = { args: { open: true, shown: 4 } }
