import type { Meta, StoryObj } from '@storybook/react'
import { COPY } from './copy'
import { finishedScenario, SCENARIOS } from './fixtures'
import { Frames } from './StoryFrames'

const meta: Meta<typeof Frames> = {
  title: 'Screens/TallyApp',
  tags: ['!autodocs'],
  component: Frames,
  parameters: { tally: { bare: true }, layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Frames>

/** First launch: the sample history and the notice that it clears. */
export const FirstRun: Story = { args: { store: SCENARIOS.firstRun } }

/** A household that hasn't played yet. */
export const EmptyHousehold: Story = { args: { store: SCENARIOS.empty } }

/** A game in progress: the resume card leads Home and the nav fox wears the jade cards badge. */
export const HomeWithLiveGame: Story = {
  args: { store: SCENARIOS.flip7Race, ui: { screen: 'home', sheet: null } },
}

/** Level at the top of the standings: "Dead heat", an "=" chip and both names. */
export const HomeDeadHeat: Story = { args: { store: SCENARIOS.deadHeat } }

/** History before the first game: the empty state offers to deal one. */
export const HistoryEmpty: Story = { args: { store: SCENARIOS.empty, ui: { screen: 'history' } } }

export const History: Story = { args: { store: SCENARIOS.firstRun, ui: { screen: 'history' } } }

export const Flip7Race: Story = {
  args: { store: SCENARIOS.flip7Race, ui: { sheet: { type: 'game' }, sheetKey: 1 } },
}

export const MatchPoint: Story = {
  args: {
    store: SCENARIOS.matchPoint,
    ui: {
      sheet: { type: 'game' },
      sheetKey: 1,
      toast: { msg: COPY.toast.matchPoint(['Kate']), k: 1 },
    },
  },
}

export const SushiGoFinalRound: Story = {
  args: {
    store: SCENARIOS.sushiFinal,
    ui: {
      sheet: { type: 'game' },
      sheetKey: 1,
      banner: { text: COPY.banner.finalRound, tone: 'amber', k: 1 },
    },
  },
}

/** Uno, "Who won?": one big button per player; a tap scores the game and crowns them. */
export const UnoWhoWon: Story = {
  args: { store: SCENARIOS.unoWhoWon, ui: { sheet: { type: 'game' }, sheetKey: 1 } },
}

/** Jaipur, first to 2 wins, level at 1–1: lanes to the target, "1 to win", crowns in the log. */
export const JaipurMatch: Story = {
  args: { store: SCENARIOS.jaipurMatch, ui: { sheet: { type: 'game' }, sheetKey: 1 } },
}

/** Tied at the end: crown a leader by the game's own tiebreak rule, or score a tiebreak round. */
export const Tiebreak: Story = {
  args: {
    store: SCENARIOS.tiebreak,
    ui: { sheet: { type: 'game' }, sheetKey: 1, toast: { msg: COPY.toast.tied, k: 1 } },
  },
}

/** Hearts: lowest wins, Kate is creeping up on the bust line. */
export const LowWinsHearts: Story = {
  args: {
    store: SCENARIOS.hearts,
    ui: { sheet: { type: 'game' }, sheetKey: 1, toast: { msg: COPY.toast.danger(['Kate']), k: 1 } },
  },
}

export const Victory: Story = {
  args: {
    store: () => finishedScenario().store,
    ui: (() => {
      const { game } = finishedScenario()
      return { finished: game, victory: game }
    })(),
  },
}
