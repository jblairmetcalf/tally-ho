import type { Meta, StoryObj } from '@storybook/react'
import { Button, Pill, PillRow, Segmented, SFX, Staff } from '@tally/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type CodaFacts,
  codaOf,
  DEFAULT_PLAYERS,
  type Game,
  makeSamples,
  NOTE_NAMES,
  plotOf,
  rng,
  type Seal,
  type SongNote,
  type Story as SongStory,
  scheduleOf,
  songOf,
  voiceOf,
} from '../../../../packages/core/src'
import { BARE, Mono, Page, pageTheme, Section } from './chrome'

const meta: Meta = { title: 'Foundations/Fox Trot Lab', tags: ['!autodocs'], parameters: BARE }
export default meta
type Story = StoryObj

/** The sample games (fixed clock: deterministic), one per name: each name is its own key. */
const SAMPLE_GAMES: Game[] = (() => {
  const all = makeSamples({ now: () => Date.parse('2026-10-15T12:00:00Z') })
  const seen = new Set<string>()
  return all.filter((g) => !seen.has(g.name) && seen.add(g.name))
})()
const PLAYERS = DEFAULT_PLAYERS
const colorOf = (id: string) => PLAYERS.find((p) => p.id === id)?.color ?? 0

const STORIES: { id: SongStory; label: string; what: string }[] = [
  {
    id: 'comeback',
    label: 'Comeback',
    what: 'Trailed by a quarter of the way: sinks under the root, then leaps.',
  },
  { id: 'first', label: 'First win', what: 'Their first ever: a simple rising arpeggio.' },
  { id: 'upset', label: 'Upset', what: 'Won from last in the standings: falls, then vaults.' },
  {
    id: 'new',
    label: 'New champ',
    what: 'Now the sole leader of the standings: a climbing fanfare.',
  },
  { id: 'defend', label: 'Defending', what: 'The leader stays the leader: steady, then up.' },
  {
    id: 'routine',
    label: 'Routine',
    what: "The winner's signature, walking up into it for a stronger win.",
  },
]
const SEALS: { id: Seal; label: string; what: string }[] = [
  {
    id: 'photo',
    label: 'Photo finish',
    what: 'The runner-up answers underneath; a 4th resolves to the 3rd.',
  },
  {
    id: 'decisive',
    label: 'Decisive',
    what: 'The margin as an interval: a clean fifth rings over the chord.',
  },
  { id: 'steam', label: 'Steamroller', what: "`deal`'s sparkle blooms high over the chord." },
]
const STRENGTH = { low: 0.1, mid: 0.5, high: 0.9 } as const

const noteName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`
const spell = (ns: SongNote[]) =>
  ns
    .filter((n) => n.part !== 'bass')
    .map((n) => noteName(n.midi))
    .join(' ') || '—'

interface Bench {
  game: string
  winner: string
  runnerUp: string
  story: SongStory
  streak: number
  seal: Seal
  strength: keyof typeof STRENGTH
}
const START: Bench = {
  game: SAMPLE_GAMES[0]?.name ?? 'Flip 7',
  winner: 'kate',
  runnerUp: 'blair',
  story: 'new',
  streak: 3,
  seal: 'photo',
  strength: 'mid',
}

function Lab() {
  const [b, setB] = useState<Bench>(START)
  const [playing, setPlaying] = useState(false)
  const [seed, setSeed] = useState(1)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const set = (patch: Partial<Bench>) => {
    SFX.pick()
    setB((x) => ({ ...x, ...patch }))
  }
  const stop = useCallback(() => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
    setPlaying(false)
    SFX.stopSong()
  }, [])
  useEffect(() => stop, [stop])

  const game = SAMPLE_GAMES.find((g) => g.name === b.game) ?? SAMPLE_GAMES[0]!
  const facts = useMemo(
    (): CodaFacts => ({
      story: b.story,
      streak: b.streak,
      seal: b.seal,
      strength: STRENGTH[b.strength],
      voice: voiceOf(colorOf(b.winner)),
      color: colorOf(b.winner),
      answer: voiceOf(colorOf(b.runnerUp)),
      winner: b.winner,
      runnerUp: b.runnerUp,
    }),
    [b],
  )
  const song = useMemo(() => ({ ...songOf(game, colorOf), coda: facts }), [game, facts])
  const sched = scheduleOf(song)
  const coda = codaOf(song.key, facts)
  const notes = plotOf(sched, colorOf)

  const playAll = () => {
    stop()
    SFX.song(sched.notes)
    // The staff lights each note as it sounds while `playing`; it ends with the song.
    setPlaying(true)
    timers.current.push(setTimeout(() => setPlaying(false), sched.length * 1000))
  }
  const playSlot = (notes: SongNote[]) => {
    stop()
    SFX.song(notes)
  }
  const randomise = () => {
    const r = rng(seed * 7919)
    setSeed((x) => x + 1)
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)] ?? xs[0]!
    const winner = pick(PLAYERS).id
    SFX.pick()
    setB({
      game: pick(SAMPLE_GAMES).name,
      winner,
      runnerUp: pick(PLAYERS.filter((p) => p.id !== winner)).id,
      story: pick(STORIES).id,
      streak: 1 + Math.floor(r() * 5),
      seal: pick(SEALS).id,
      strength: pick(['low', 'mid', 'high'] as const),
    })
  }

  const who = (label: string, key: 'winner' | 'runnerUp') => (
    <PillRow scroll label={label}>
      {PLAYERS.map((p) => (
        <Pill
          key={p.id}
          on={b[key] === p.id}
          chip={{ name: p.name, color: p.color }}
          onClick={() => set({ [key]: p.id })}
        >
          {p.name}
        </Pill>
      ))}
    </PillRow>
  )

  return (
    <>
      <Section title="The bench" note="Set how the game was won; the song follows.">
        <div className="card flex flex-col gap-3">
          <span className="eyebrow">Game (sets the key and the rounds)</span>
          <PillRow scroll label="Game">
            {SAMPLE_GAMES.map((g) => (
              <Pill key={g.name} on={b.game === g.name} onClick={() => set({ game: g.name })}>
                {g.name}
              </Pill>
            ))}
          </PillRow>
          <span className="eyebrow">Winner</span>
          {who('Winner', 'winner')}
          <span className="eyebrow">Runner-up (answers a photo finish)</span>
          {who('Runner-up', 'runnerUp')}
          <span className="eyebrow">Story</span>
          <PillRow scroll label="Story">
            {STORIES.map((s) => (
              <Pill key={s.id} on={b.story === s.id} onClick={() => set({ story: s.id })}>
                {s.label}
              </Pill>
            ))}
          </PillRow>
          <span className="eyebrow">Streak</span>
          <Segmented
            label="Streak"
            options={['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }))}
            value={String(b.streak)}
            onChange={(v) => set({ streak: Number(v) })}
          />
          <span className="eyebrow">Margin</span>
          <Segmented
            label="Margin"
            options={SEALS.map((s) => ({ value: s.id, label: s.label }))}
            value={b.seal}
            onChange={(seal) => set({ seal })}
          />
          <span className="eyebrow">Strength (a routine win's climb)</span>
          <Segmented
            label="Strength"
            options={(['low', 'mid', 'high'] as const).map((v) => ({ value: v, label: v }))}
            value={b.strength}
            onChange={(strength) => set({ strength })}
          />
          <div className="flex flex-wrap gap-3">
            <Button icon="play" onClick={playAll}>
              Play it
            </Button>
            <Button variant="ghost" icon="repeat" onClick={randomise}>
              Randomise
            </Button>
          </div>
          <Staff
            notes={notes}
            length={sched.length}
            playing={playing}
            label={`${game.name} fox trot`}
          />
          <Mono className="text-faint">{`${sched.length.toFixed(2)} s · ${sched.notes.length} notes`}</Mono>
        </div>
      </Section>
      <Section title="The coda, slot by slot" note="Three slots, one fact each, so each is heard.">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['Story', STORIES.find((s) => s.id === b.story)?.what ?? '', coda.story],
              [
                'Chord',
                `A streak of ${b.streak}: ${b.streak} stacked tone${b.streak > 1 ? 's' : ''}, rolled up like start, the winner's signature colour on top.`,
                coda.chord,
              ],
              ['Seal', SEALS.find((s) => s.id === b.seal)?.what ?? '', coda.seal],
            ] as const
          ).map(([title, what, notes]) => (
            <div key={title} className="card flex flex-col items-start gap-2">
              <b className="display text-[22px]">{title}</b>
              <span className="text-[13.5px]">{what}</span>
              <Mono className="text-faint">{spell([...notes])}</Mono>
              <Button
                size="sm"
                variant="ghost"
                icon="play"
                disabled={!notes.length}
                onClick={() => playSlot([...notes])}
              >
                {`Play the ${title.toLowerCase()}`}
              </Button>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

export const FoxTrotLab: Story = {
  name: 'Fox Trot Lab',
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      title="Fox Trot Lab"
      lede={
        <>
          Every finished game is a fox trot: the game's riff, a step per round, then a coda that
          tells how it was won. The Chime Lab's ideas (decision 29), on the app's own 8-bit synth.
          Set the bench, then play the whole song or one slot at a time. Built from{' '}
          <Mono>codaOf</Mono> and <Mono>scheduleOf</Mono> in @tally/core; nothing is stored.
        </>
      }
    >
      <Lab />
    </Page>
  ),
}
