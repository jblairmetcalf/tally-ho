import type { Meta, StoryObj } from '@storybook/react'
import { type ShelfItem, StickerShelf } from './StickerShelf'

const items: ShelfItem[] = (
  [
    {
      key: 'a',
      name: 'Hat Trick',
      sub: 'Kate · Flip 7',
      sticker: { tone: 'fox', icon: 'flame', shape: 'burst' },
    },
    {
      key: 'b',
      name: 'Night Owl',
      sub: 'Blair · Uno',
      sticker: { tone: 'sky', icon: 'moon', shape: 'hex' },
    },
    {
      key: 'c',
      name: 'Photo Finish',
      sub: 'Alder · Jaipur',
      sticker: { tone: 'coral', icon: 'camera', shape: 'circle' },
    },
    {
      key: 'd',
      name: 'Polymath',
      sub: 'Kate · Spicy',
      sticker: { tone: 'lav', icon: 'cards', shape: 'circle' },
    },
    {
      key: 'e',
      name: 'Marathon',
      sub: 'Blair · Sushi Go',
      sticker: { tone: 'jade', icon: 'clock', shape: 'square' },
    },
  ] as Omit<ShelfItem, 'label'>[]
).map((x) => ({ ...x, label: `${x.name}, ${x.sub}. Open sticker book` }))

const meta: Meta<typeof StickerShelf> = {
  title: 'Scoreboard/StickerShelf',
  component: StickerShelf,
  args: { items, onPick: () => {}, label: 'Fresh stickers' },
}
export default meta
type Story = StoryObj<typeof StickerShelf>

/** Home's "Fresh stickers": one line that scrolls edge to edge. */
export const Scrolling: Story = { args: { scroll: true } }
/** A game's details: the stickers it gave out, wrapping. */
export const Wrapping: Story = { args: { items: items.slice(0, 3) } }
