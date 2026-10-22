import type { Meta, StoryObj } from '@storybook/react'
import { byId, SAMPLES, staffFor } from './fixtures'
import { MixtapeShelf, SongCard, type SongCardProps } from './SongCard'

const cardFor = (i: number, over: Partial<SongCardProps> = {}): SongCardProps => {
  const g = SAMPLES[i]!
  const w = byId(g.winnerId ?? '')
  return {
    game: g.name,
    color: w.color,
    meta: `${w.name} · Oct ${14 - i} · ${g.rounds.length} rounds`,
    song: staffFor(g),
    onPlay: () => {},
    onOpen: () => {},
    playLabel: `Play ${g.name} fox trot`,
    openLabel: `${g.name}, won by ${w.name}. Open game`,
    ...over,
  }
}

const meta: Meta<typeof SongCard> = {
  title: 'Scoreboard/SongCard',
  component: SongCard,
  args: cardFor(0),
  argTypes: {
    color: { control: { type: 'range', min: 0, max: 7, step: 1 } },
  },
}
export default meta
type Story = StoryObj<typeof SongCard>

/** A song on the shelf, cover in the winner's colour. */
export const Idle: Story = {}
/** Playing: the record spins, the playhead steps through the staff, the button stops it. */
export const Playing: Story = {
  args: {
    playing: true,
    playLabel: `Stop ${SAMPLES[0]!.name} fox trot`,
  },
}
/** Just finished: it arrives on the shelf with a pop. */
export const Pressed: Story = { args: { isNew: true } }
/** A long game name wraps on the cover. */
export const LongName: Story = { args: { game: 'Ticket to Ride: Europe Legacy' } }

/** Home's Fox Trots: the latest six, one line edge to edge; the second is playing (lifted above the rest, nothing clipped). */
export const Shelf: StoryObj<typeof MixtapeShelf> = {
  render: () => (
    <MixtapeShelf label="Fox Trots" empty="Finish a game for your first fox trot">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <SongCard key={i} {...cardFor(i, i === 1 ? { playing: true } : {})} />
      ))}
    </MixtapeShelf>
  ),
}
/** No finished games yet: one line instead of the shelf. */
export const EmptyShelf: StoryObj<typeof MixtapeShelf> = {
  render: () => <MixtapeShelf label="Fox Trots" empty="Finish a game for your first fox trot" />,
}
