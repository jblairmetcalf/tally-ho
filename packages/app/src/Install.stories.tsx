import type { Decorator, Meta, StoryObj } from '@storybook/react'
import { COPY } from './copy'
import { SCENARIOS } from './fixtures'
import { type InstallInfo, InstallPreview } from './install'
import { Frames } from './StoryFrames'

/** The address the share and desktop codes point at, the same on every run. */
const URL = 'https://tally-ho.vercel.app/'

/** Pretend to be a given device, so each platform's guide can be shown. */
const as =
  (info: Partial<InstallInfo>): Decorator =>
  (Story) => (
    <InstallPreview.Provider value={{ info, url: URL }}>
      <Story />
    </InstallPreview.Provider>
  )

const IPHONE: Partial<InstallInfo> = {
  installed: false,
  platform: 'ios',
  iosBrowser: 'safari',
  canPrompt: false,
}

const meta: Meta<typeof Frames> = {
  title: 'Sheets/Install and share',
  tags: ['!autodocs'],
  component: Frames,
  parameters: { tally: { bare: true }, layout: 'fullscreen' },
  decorators: [as(IPHONE)],
}
export default meta
type Story = StoryObj<typeof Frames>

const install = {
  store: SCENARIOS.firstRun,
  ui: { sheet: { type: 'install' }, sheetKey: 1 },
} as const

/** iPhone Safari: Share, Add to Home Screen, Add, each with the icon to look for. */
export const InstallIPhoneSafari: Story = { args: install }

/** Chrome, Edge or Firefox on an iPhone: the same steps, Share in the address bar, and a nudge to Safari. */
export const InstallIPhoneOtherBrowser: Story = {
  args: install,
  decorators: [as({ ...IPHONE, iosBrowser: 'other' })],
}

/** Android Chrome offered its prompt: one big Install button. */
export const InstallAndroidPrompt: Story = {
  args: install,
  decorators: [as({ ...IPHONE, platform: 'android', canPrompt: true })],
}

/** Android without the prompt (another browser, or Chrome hasn't offered it): the menu's steps. */
export const InstallAndroidMenu: Story = {
  args: install,
  decorators: [as({ ...IPHONE, platform: 'android' })],
}

/** On a computer: a QR code to open it on the phone, then the address bar's install icon. */
export const InstallDesktop: Story = {
  args: install,
  decorators: [as({ ...IPHONE, platform: 'desktop' })],
}

/** Desktop Chromium with the prompt: the code, then one-click install. */
export const InstallDesktopPrompt: Story = {
  args: install,
  decorators: [as({ ...IPHONE, platform: 'desktop', canPrompt: true })],
}

/** Already on the Home Screen: "You're all set". */
export const InstallInstalled: Story = {
  args: install,
  decorators: [as({ ...IPHONE, installed: true })],
}

const settings = {
  store: SCENARIOS.firstRun,
  ui: { sheet: { type: 'settings' }, sheetKey: 1 },
} as const
const open = (label: string) => (frame: HTMLElement) => {
  const b = [...frame.querySelectorAll<HTMLButtonElement>('.link-row')].find((x) =>
    x.textContent?.startsWith(label),
  )
  b?.click()
  return !!b
}

/** The top of Settings: the fox says hi, then install, share and the maker. */
export const SettingsLanding: Story = { args: settings }

/** Settings when it's already installed: the install row says so. */
export const SettingsLandingInstalled: Story = {
  args: settings,
  decorators: [as({ ...IPHONE, installed: true })],
}

/** Settings › Install on your phone: the same guide, nested over Settings. */
export const SettingsInstall: Story = { args: { ...settings, act: open(COPY.settings.install) } }

/** Settings › Share Tally Ho!: the QR code with the fox, the address, Share… and Copy link. */
export const Share: Story = { args: { ...settings, act: open(COPY.settings.share) } }

/** Settings › Say hi to the maker: Blair, a warm line, and a link to his site. */
export const Contact: Story = { args: { ...settings, act: open(COPY.settings.contact) } }
