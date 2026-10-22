import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SwipeView } from './SwipeView'

const meta: Meta<typeof SwipeView> = {
  title: 'Primitives/SwipeView',
  component: SwipeView,
  tags: ['!autodocs'],
}
export default meta
type Story = StoryObj<typeof SwipeView>

const PAGES = ['Home', 'History']

/** Two tabs: swipe left and right (touch, or the device toolbar's touch mode); the next slides in from that side. */
export const TwoTabs: Story = {
  render: () => {
    const [i, setI] = useState(0)
    const [enter, setEnter] = useState<'from-next' | 'from-prev' | null>(null)
    return (
      <SwipeView
        key={i}
        enter={enter}
        hasPrev={i > 0}
        hasNext={i < PAGES.length - 1}
        onSwipe={(to) => {
          setEnter(to === 'next' ? 'from-next' : 'from-prev')
          setI((x) => x + (to === 'next' ? 1 : -1))
        }}
      >
        <div className="card" style={{ minHeight: 220 }}>
          <h2 className="sec">{PAGES[i]}</h2>
          <p className="hint">Swipe {i ? 'right for Home' : 'left for History'}.</p>
        </div>
      </SwipeView>
    )
  },
}
