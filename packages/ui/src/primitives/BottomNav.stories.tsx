import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { BottomNav } from './BottomNav'

const meta: Meta<typeof BottomNav> = {
  title: 'Primitives/BottomNav',
  component: BottomNav,
  args: {
    screen: 'home',
    live: false,
    foxKey: 0,
    inline: true,
    onHome: () => {},
    onHistory: () => {},
    onFab: () => {},
  },
  argTypes: { screen: { control: 'inline-radio', options: ['home', 'history', null] } },
}
export default meta
type Story = StoryObj<typeof BottomNav>

/** Home is lit; the FAB starts a new game (amber +). */
export const Home: Story = {}
export const History: Story = { args: { screen: 'history' } }
/** A game is in progress: the FAB's badge turns jade with cards — back to the game. */
export const Live: Story = { args: { live: true } }
/** Neither tab lit (e.g. on settings). */
export const NoneSelected: Story = { args: { screen: null } }

/** Tap the tabs; tap the fox to make it twitch (each scored round re-keys it). */
export const Interactive: Story = {
  render: () => {
    const [screen, setScreen] = useState<'home' | 'history'>('home')
    const [k, setK] = useState(0)
    return (
      <BottomNav
        inline
        screen={screen}
        live={k % 2 === 1}
        foxKey={k}
        onHome={() => setScreen('home')}
        onHistory={() => setScreen('history')}
        onFab={() => setK((x) => x + 1)}
      />
    )
  },
}

/** Fixed to the viewport bottom, as in the app. */
export const Fixed: Story = { parameters: { tally: { overlay: true } }, args: { inline: false } }
