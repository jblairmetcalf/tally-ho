import type { Meta, StoryObj } from '@storybook/react'
import { encode } from 'uqr'
import { QrCode, type QrMatrix } from './QrCode'

const URL = 'https://tally-ho.vercel.app/'
const matrixOf = (value: string): QrMatrix => {
  const { size, data } = encode(value, { ecc: 'H', border: 0 })
  return { size, data }
}

const meta: Meta<typeof QrCode> = {
  title: 'Primitives/QrCode',
  component: QrCode,
  args: { value: URL, label: `QR code for ${URL}`, size: 208, badge: true, matrix: matrixOf(URL) },
  argTypes: {
    size: { control: { type: 'range', min: 120, max: 320, step: 8 } },
    badge: { control: 'boolean' },
    matrix: { control: false },
  },
}
export default meta
type Story = StoryObj<typeof QrCode>

/** The share sheet's code: ink on a white plate in both themes, the fox in the middle. */
export const WithFox: Story = {}

/** No badge: every module showing. */
export const Plain: Story = { args: { badge: false } }

/** No matrix given: the encoder loads on demand, then the code replaces the placeholder. */
export const EncodedOnDemand: Story = { args: { matrix: undefined } }

/** While the encoder loads: a quiet placeholder holds the same square, so nothing moves. */
export const Loading: Story = { args: { matrix: null } }

/** Smaller, as on the desktop install guide. */
export const Small: Story = { args: { size: 152 } }

/** A long address makes a denser code (a higher version); still crisp, the fox still fits. */
export const LongAddress: Story = {
  args: (() => {
    const long = 'https://tally-ho-git-feature-install-guide-blair-metcalf.vercel.app/?from=share'
    return { value: long, label: `QR code for ${long}`, matrix: matrixOf(long) }
  })(),
}
