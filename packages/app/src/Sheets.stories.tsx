import type { Meta, StoryObj } from '@storybook/react'
import { COPY } from './copy'
import { SCENARIOS } from './fixtures'
import { clickButton, Frames } from './StoryFrames'

const meta: Meta<typeof Frames> = {
  title: 'Sheets/App sheets',
  tags: ['!autodocs'],
  component: Frames,
  parameters: { tally: { bare: true }, layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Frames>

/** The games pill row in New game, most played first. */
const gamePills = (frame: HTMLElement) => [
  ...frame.querySelectorAll<HTMLButtonElement>(`[aria-label="${COPY.newGame.what}"] button`),
]

/** Type into a React-controlled input the way a keyboard would. */
function typeInto(input: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Nothing picked yet: "How does it end?" holds its full height as shimmering skeletons. */
export const NewGame: Story = {
  args: { store: SCENARIOS.firstRun, ui: { sheet: { type: 'new' }, sheetKey: 1 } },
}

/** The most played game picked: the real controls fade in where the skeletons were. */
export const NewGamePicked: Story = {
  args: {
    ...NewGame.args,
    act: (frame) => {
      const first = gamePills(frame)[0]
      first?.click()
      return !!first
    },
  },
}

/** "Other": the name field takes the line under the games; nothing below moves. */
export const NewGameOther: Story = {
  args: {
    ...NewGame.args,
    act: (frame) => {
      const other = gamePills(frame).at(-1)
      const input = frame.querySelector<HTMLInputElement>('#other-name')
      if (!other || !input) return false
      if (other.getAttribute('aria-pressed') !== 'true') {
        other.click()
        return false
      }
      typeInto(input, 'Pictionary')
      return true
    },
  },
}

/** Pick a game by name in the pills row (it may need a frame or two to appear). */
const pickGame = (name: string) => (frame: HTMLElement) => {
  const pill = gamePills(frame).find((b) => b.textContent?.trim() === name)
  if (!pill) return false
  if (pill.getAttribute('aria-pressed') !== 'true') pill.click()
  return pill.getAttribute('aria-pressed') === 'true'
}

/** Uno: "Who won?" with one win needed; the low-wins switch gives way to how it scores. */
export const NewGameWhoWon: Story = { args: { ...NewGame.args, act: pickGame('Uno') } }

/** Scout: Rounds, one per player, so the count shows the line-up's size (3) and follows it. */
export const NewGameRoundsPerPlayer: Story = { args: { ...NewGame.args, act: pickGame('Scout') } }

export const EditRound: Story = {
  args: {
    store: SCENARIOS.flip7Race,
    ui: { screen: 'game', sheet: { type: 'round', idx: 1 }, sheetKey: 1 },
  },
}

/** Editing a "Who won?" round: pick the winner instead of typing scores. */
export const EditRoundWhoWon: Story = {
  args: {
    store: SCENARIOS.jaipurMatch,
    ui: { screen: 'game', sheet: { type: 'round', idx: 0 }, sheetKey: 1 },
  },
}

export const EndGame: Story = {
  args: { store: SCENARIOS.flip7Race, ui: { screen: 'game', sheet: { type: 'end' }, sheetKey: 1 } },
}

/** Tied: crown one of the leaders by the game's tiebreak rule, keep playing, or discard. */
export const EndGameTied: Story = {
  args: { store: SCENARIOS.tiebreak, ui: { screen: 'game', sheet: { type: 'end' }, sheetKey: 1 } },
}

export const GameDetail: Story = {
  args: { store: SCENARIOS.firstRun, ui: { sheet: { type: 'detail', id: 's0' }, sheetKey: 1 } },
}

export const Settings: Story = {
  args: { store: SCENARIOS.firstRun, ui: { sheet: { type: 'settings' }, sheetKey: 1 } },
}

/** Adding a game: a draft sheet over Settings; nothing is saved until it has a name. */
export const SettingsAddGame: Story = {
  args: { ...Settings.args, act: (frame) => clickButton(frame, COPY.settings.addGame) },
}

/** Editing a player opens a second sheet over Settings, with its own backdrop. */
export const SettingsEditPlayer: Story = {
  args: { ...Settings.args, act: (frame) => clickButton(frame, COPY.settings.editPlayer('Kate')) },
}

/** Editing a game: name, how it ends, low-wins and delete, in a sheet over Settings. */
export const SettingsEditGame: Story = {
  args: {
    ...Settings.args,
    act: (frame) => {
      const edit = [
        ...frame.querySelectorAll<HTMLButtonElement>(
          '[aria-labelledby="set-games"] button[aria-haspopup]',
        ),
      ][0]
      edit?.click()
      return !!edit
    },
  },
}

/** Editing a "Who won?" game (Uno): the wins needed, and no low-wins switch. */
export const SettingsEditWhoWon: Story = {
  args: { ...Settings.args, act: (frame) => clickButton(frame, COPY.settings.editGame('Uno')) },
}
