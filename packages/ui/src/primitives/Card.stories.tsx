import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import { Card, Eyebrow, Notice, SectionTitle } from './Card'

const meta: Meta<typeof Card> = { title: 'Primitives/Card', component: Card }
export default meta
type Story = StoryObj<typeof Card>

/** The basic surface, with an eyebrow and a section title. */
export const Basic: Story = {
  render: () => (
    <Card as="section">
      <Eyebrow>Family champion</Eyebrow>
      <SectionTitle>Standings</SectionTitle>
      <p className="hint" style={{ margin: '6px 0 0' }}>
        Cards sit one step up from the page.
      </p>
    </Card>
  ),
}

/** Header row: a title on the left, an eyebrow on the right (as on Standings). */
export const HeaderRow: Story = {
  render: () => (
    <Card>
      <div className="flex items-baseline justify-between">
        <SectionTitle>Standings</SectionTitle>
        <Eyebrow>Wins</Eyebrow>
      </div>
    </Card>
  ),
}

/** The dashed lavender notice, with an action. */
export const NoticeWithAction: Story = {
  render: () => (
    <Notice
      action={
        <Button size="sm" variant="ghost">
          Clear
        </Button>
      }
    >
      These are sample games so you can see the scoreboard. They clear when you start your first
      real game.
    </Notice>
  ),
}

export const NoticeAlone: Story = {
  render: () => <Notice>Play as long as you like, then tap the flag to crown the leader.</Notice>,
}

/** The type helpers on their own. */
export const Type: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Eyebrow>What are we playing?</Eyebrow>
      <SectionTitle>Recent games</SectionTitle>
      <span className="hint">Blank counts as 0</span>
    </div>
  ),
}
