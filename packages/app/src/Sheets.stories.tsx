import type { Meta, StoryObj } from '@storybook/react'
import { COPY } from './copy'
import { SCENARIOS } from './fixtures'
import { clickButton, clickRow, Frames, pushPages } from './StoryFrames'
import { demoSession } from './sync/session'

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

/** Settings is a short landing: the fox, Players / Games / Appearance rows, Family, the way out. */
export const Settings: Story = {
  args: { store: SCENARIOS.firstRun, ui: { sheet: { type: 'settings' }, sheetKey: 1 } },
}

const S = COPY.settings
/** Push a Settings area from its landing row. */
const area = (title: string) => ({ title, press: (p: HTMLElement) => clickRow(p, title) })
/** Then press a button (by its accessible name) on that page, landing on `title`. */
const tap = (title: string, name = title) => ({
  title,
  press: (p: HTMLElement) => clickButton(p, name),
})

/** Settings › Players: back top left, close top right, the line-up, archived players, Add a player. */
export const SettingsPlayers: Story = {
  args: { ...Settings.args, act: pushPages(area(S.players)) },
}

/** Settings › Games: every game with how it ends, and Add a game pinned at the bottom. */
export const SettingsGames: Story = {
  args: { ...Settings.args, act: pushPages(area(S.games)) },
}

/** Settings › Appearance: theme, sound, haptics, keep awake, and clearing the samples. */
export const SettingsAppearance: Story = {
  args: { ...Settings.args, act: pushPages(area(S.appearance)) },
}

/** Two deep: Settings › Players › Edit Kate, pushed from the right; Back returns to Players. */
export const SettingsEditPlayer: Story = {
  args: {
    ...Settings.args,
    act: pushPages(area(S.players), tap(S.editPlayer('Kate'))),
  },
}

/** Settings › Games › Add a game: a draft page; nothing is saved until it has a name. */
export const SettingsAddGame: Story = {
  args: {
    ...Settings.args,
    act: pushPages(area(S.games), tap(S.addGameTitle, S.addGame)),
  },
}

/** Settings › Games › Edit Flip 7: name, how it ends, low-wins and delete. */
export const SettingsEditGame: Story = {
  args: {
    ...Settings.args,
    act: pushPages(area(S.games), tap(S.editGame('Flip 7'))),
  },
}

/** Editing a "Who won?" game (Uno): the wins needed, and no low-wins switch. */
export const SettingsEditWhoWon: Story = {
  args: {
    ...Settings.args,
    act: pushPages(area(S.games), tap(S.editGame('Uno'))),
  },
}

/** Settings › Family sign in: the form as a page, back to Settings top left. */
export const SettingsSignIn: Story = {
  args: {
    ...Settings.args,
    session: () => demoSession({ enabled: true }),
    act: pushPages(tap(COPY.signIn.title, COPY.family.signIn)),
  },
}
