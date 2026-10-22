import type { CompletedGame, Game, SongKey } from './schemas'
import { evaluate, hash, nearTarget } from './scoring'
import { isCompleted } from './stats'
import { isComeback, isPhotoFinish, isSteamroller, totalsAt } from './stickers'

/**
 * The Fox Trot (docs/DECISIONS.md 27): every game is a short song composed from its rounds. A
 * song is a pure function of the game, never stored: the same rounds always give the same tune,
 * on every phone, and editing a round changes it. Harmony comes first (a key and a four-chord
 * loop from the game's name), so the scores only choose which chord tones sing and when a lick
 * marks a moment. Every note is diatonic and every beat's tone is in that beat's chord.
 */

export type Voice = 'root' | 'third' | 'fifth'
/** How high a round's note sits: 0 low, 1 middle, 2 high. */
export type Band = 0 | 1 | 2
export type Lick = 'turnaround' | 'hammer' | 'slide' | 'suspension'

const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] } as const

/** Chord loops as scale degrees (0 = I/i). Four familiar pop loops per mode. */
export const LOOPS = {
  // I–V–vi–IV, I–vi–IV–V, vi–IV–I–V, I–IV–vi–V
  major: [
    [0, 4, 5, 3],
    [0, 5, 3, 4],
    [5, 3, 0, 4],
    [0, 3, 5, 4],
  ],
  // i–VI–III–VII, i–iv–VII–III, i–VII–VI–VII, i–iv–v–i
  minor: [
    [0, 5, 2, 6],
    [0, 3, 6, 2],
    [0, 6, 5, 6],
    [0, 3, 4, 0],
  ],
} as const

/** Roman numerals for a loop, for the key picker and the docs. */
export function loopName(mode: SongKey['mode'], loop: number): string {
  const up = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  const minorQuality = [false, false, true, false, false, true, true] // major chords in minor
  const majorQuality = [true, false, false, true, true, false, false]
  return (LOOPS[mode][loop] ?? LOOPS[mode][0])
    .map((d) => {
      const big = (mode === 'major' ? majorQuality : minorQuality)[d]
      const n = up[d] ?? 'I'
      return big ? n : n.toLowerCase()
    })
    .join('–')
}

export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] as const

/** Tunable feel, like `STICKER_RULES`. */
export const SONG_RULES = {
  /** Seconds per beat (one round): 150 bpm, tighter past 7 rounds so the whole song stays under 5 s. */
  beat: 0.4,
  minBeat: 0.12,
  body: 2.4,
  /** The intro riff and the coda, per note. */
  step: 0.08,
  story: 0.1,
  /** Race games: a round's top score as a share of the target → low / middle / high / high + ninth. */
  race: [0.08, 0.2, 0.3],
  /** Rounds and open games: the top score against the best earlier round → middle / high. */
  record: [1 / 3, 2 / 3],
} as const

/** A player's part in every chord, from their colour, so they always sing the same part. */
export function voiceOf(color: number): Voice {
  return (['root', 'third', 'fifth'] as const)[(((color % 3) + 3) % 3) as 0 | 1 | 2]
}
const VOICE_STEP: Record<Voice, number> = { root: 0, third: 2, fifth: 4 }

type Named = Pick<Game, 'name' | 'lowWins'> & { song?: SongKey | undefined }

/** The game's key and loop: its own (picked for the game type), else from its name. */
export function keyOf(g: Named): SongKey {
  if (g.song) return g.song
  const h = hash(g.name.trim().toLowerCase())
  return { tonic: h % 12, mode: g.lowWins ? 'minor' : 'major', loop: Math.floor(h / 12) % 4 }
}

/** A note as a scale-degree index (0 = tonic, 7 = the octave up), in a band's octave. */
function degreeMidi(key: SongKey, n: number): number {
  const scale = SCALE[key.mode]
  // Lead tonic sits between G3 and F♯4, so three bands stay singable.
  const base = 55 + ((key.tonic - 7 + 12) % 12)
  const oct = Math.floor(n / 7)
  return base + 12 * oct + (scale[((n % 7) + 7) % 7] ?? 0)
}

export interface Tone {
  playerId: string
  voice: Voice
  band: Band
  /** A record or a big round: the chord's ninth as a grace note. */
  ninth?: boolean
}
export interface Beat {
  /** The chord's root as a scale degree (0–6). */
  chord: number
  /** Who sang: the round's best (several on a tie), none on a rest. */
  tones: Tone[]
  lick?: { kind: Lick; playerId: string; voice: Voice }
}
/**
 * How the game was won (decision 29, after the Chime Lab): the ending's story, read from the
 * family's history before this game the way stickers are; the winner's streak; how close it was.
 */
export type Story = 'comeback' | 'first' | 'upset' | 'new' | 'defend' | 'routine'
export type Seal = 'photo' | 'decisive' | 'steam'
export interface Outcome {
  /** The one motif the ending plays, by precedence: comeback, first win, upset, new champion, defending champion, routine. */
  story: Story
  /** The winner's run of consecutive wins, this one included. */
  streak: number
  /** Photo finish, steamroller (the sticker rules), or plainly decisive. */
  seal: Seal
  /** How commanding the win was, 0–1: the margin over the runner-up against the larger total. */
  strength: number
  runnerUp: string | null
}
/** Everything the ending needs, in voices: what the Fox Trot Lab sets by hand. */
export interface CodaFacts extends Omit<Outcome, 'runnerUp'> {
  voice: Voice
  /** The winner's palette index: their signature colour on the final chord. */
  color: number
  /** The runner-up's part, for a photo finish's answer. */
  answer: Voice | null
  /** Who's who (player ids), so the staff colours the ending's notes. */
  winner?: string
  runnerUp?: string | null
}

export interface Song {
  key: SongKey
  /** The intro hook as scale-degree indexes. */
  riff: number[]
  beats: Beat[]
  /** The ending, once the game is finished. */
  coda?: CodaFacts
}

/** The game's riff: the loop's first two chords arpeggiated with one passing tone, 6–8 notes. */
export function riffOf(g: Named): number[] {
  const key = keyOf(g)
  const h = hash(`${g.name.trim().toLowerCase()}·riff`)
  const loop = LOOPS[key.mode][key.loop] ?? LOOPS[key.mode][0]
  const [a = 0, b = 0] = loop
  const up = (r: number) => [r + 7, r + 9, r + 11] // middle band
  const A = up(a)
  const B = up(b)
  const shapes: number[][] = [
    [A[0], A[1], A[2], A[1], -1, B[0], B[1], B[2]],
    [A[2], A[1], A[0], -1, B[0], B[2]],
    [A[0], A[2], A[1], -1, B[1], B[0], B[2]],
    [A[1], A[0], A[2], A[2], -1, B[2], B[1]],
  ].map((s) => s.map((n) => n ?? 0))
  const shape = shapes[h % shapes.length] ?? []
  // The passing tone: the scale step from the note before it toward the note after it.
  return shape.map((n, i) => {
    if (n !== -1) return n
    const prev = shape[i - 1] ?? 0
    const next = shape[i + 1] ?? prev
    return next > prev ? prev + 1 : next < prev ? prev - 1 : prev + 1
  })
}

type ColorOf = (playerId: string) => number

/** The round's best: who scored it, or `[]` for a rest (nobody scored). */
function bestOf(g: Game, i: number): { ids: string[]; top: number } {
  const r = g.rounds[i]
  if (!r) return { ids: [], top: 0 }
  const vals = g.playerIds.map((p) => r.scores[p] ?? 0)
  if (vals.every((v) => v === 0)) return { ids: [], top: 0 }
  const top = g.lowWins ? Math.min(...vals) : Math.max(...vals)
  return { ids: g.playerIds.filter((p) => (r.scores[p] ?? 0) === top), top }
}

/** How high round `i` sings, scaled to the game (decision 27). */
function bandOf(g: Game, i: number, top: number): { band: Band; ninth?: boolean } {
  if (g.goal === 'wins') {
    const done = evaluate({ ...g, rounds: g.rounds.slice(0, i + 1) }).done
    return { band: done ? 2 : 1 }
  }
  if (g.goal === 'score' && !g.lowWins && g.target) {
    const s = top / g.target
    const [lo, mid, hi] = SONG_RULES.race
    if (s >= hi) return { band: 2, ninth: true }
    return { band: s >= mid ? 2 : s >= lo ? 1 : 0 }
  }
  // Rounds, open and low-wins games: against the best earlier round.
  const earlier = g.rounds
    .slice(0, i)
    .map((_, k) => bestOf(g, k))
    .filter((b) => b.ids.length)
    .map((b) => b.top)
  if (!earlier.length) return { band: 1 }
  const best = g.lowWins ? Math.min(...earlier) : Math.max(...earlier)
  if (g.lowWins ? top < best : top > best) return { band: 2, ninth: true }
  if (g.lowWins) return { band: top <= best ? 2 : top <= best * 2 ? 1 : 0 }
  const s = best > 0 ? top / best : 1
  const [lo, hi] = SONG_RULES.record
  return { band: s >= hi ? 2 : s >= lo ? 1 : 0 }
}

/** The single best total after `k` rounds, or null while tied. */
function soleLeaderAt(g: Game, k: number): string | null {
  const t = totalsAt(g, k)
  const vals = g.playerIds.map((p) => t[p] ?? 0)
  const best = g.lowWins ? Math.min(...vals) : Math.max(...vals)
  const l = g.playerIds.filter((p) => t[p] === best)
  return l.length === 1 ? (l[0] ?? null) : null
}

/** The best player of the family's win counts, or null while tied (or before anyone has won). */
function soleChamp(wins: Record<string, number>): string | null {
  const ids = Object.keys(wins)
  if (!ids.length) return null
  const best = Math.max(...ids.map((p) => wins[p] ?? 0))
  const top = ids.filter((p) => wins[p] === best)
  return top.length === 1 && best > 0 ? (top[0] ?? null) : null
}

/** The runner-up and how commanding the win was (0–1). */
function strengthOf(g: CompletedGame): { runnerUp: string | null; strength: number } {
  const t = totalsAt(g, g.rounds.length)
  const sign = g.lowWins ? -1 : 1
  const others = g.playerIds
    .filter((p) => p !== g.winnerId)
    .sort((a, b) => sign * ((t[b] ?? 0) - (t[a] ?? 0)))
  const runnerUp = others[0] ?? null
  if (!runnerUp) return { runnerUp, strength: 0.5 }
  const [mine, theirs] = [t[g.winnerId] ?? 0, t[runnerUp] ?? 0]
  const scale = Math.max(Math.abs(mine), Math.abs(theirs), 1)
  return { runnerUp, strength: Math.max(0, Math.min(1, (sign * (mine - theirs)) / scale)) }
}

/**
 * How every finished game was won, in one pass in completion order (decision 29). Reads the
 * history before each game the way stickers do (and through the same rules), so songs and
 * stickers never disagree; deleting an earlier game can change a later ending, as with stickers.
 */
export function outcomesOf(games: Game[]): Map<string, Outcome> {
  const asc = games.filter(isCompleted).sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const out = new Map<string, Outcome>()
  const wins: Record<string, number> = {}
  let run: { id: string | null; n: number } = { id: null, n: 0 }
  for (const g of asc) {
    const w = g.winnerId
    // Upset: last in the standings before this game (Underdog's rule).
    const known = Object.keys(wins)
    const mine = wins[w] ?? 0
    const others = known.filter((p) => p !== w).map((p) => wins[p] ?? 0)
    const upset =
      known.includes(w) &&
      known.length >= 2 &&
      mine <= Math.min(...others) &&
      mine < Math.max(...others)
    const champBefore = soleChamp(wins)
    for (const p of g.playerIds) wins[p] ??= 0
    wins[w] = (wins[w] ?? 0) + 1
    const champAfter = soleChamp(wins)
    run = run.id === w ? { id: w, n: run.n + 1 } : { id: w, n: 1 }
    const story: Story = isComeback(g)
      ? 'comeback'
      : wins[w] === 1
        ? 'first'
        : upset
          ? 'upset'
          : champAfter === w && champBefore !== w
            ? 'new'
            : champAfter === w && champBefore === w
              ? 'defend'
              : 'routine'
    const seal: Seal = isPhotoFinish(g) ? 'photo' : isSteamroller(g) ? 'steam' : 'decisive'
    out.set(g.id, { story, streak: run.n, seal, ...strengthOf(g) })
  }
  return out
}

/** A finished game's ending when there's no history to read (a lone game): a routine win. */
const ROUTINE: Omit<Outcome, 'runnerUp'> = {
  story: 'routine',
  streak: 1,
  seal: 'decisive',
  strength: 0.5,
}

/**
 * Compose the game's song from its rounds. `colorOf` gives each player's palette index;
 * `outcome` (from `outcomesOf`) tells the ending how it was won.
 */
export function songOf(g: Game, colorOf: ColorOf, outcome?: Outcome): Song {
  const key = keyOf(g)
  const loop = LOOPS[key.mode][key.loop] ?? LOOPS[key.mode][0]
  const voice = (p: string) => voiceOf(colorOf(p))
  let streakOf: string | null = null
  let streak = 0
  const matched = new Set<string>()
  const beats: Beat[] = g.rounds.map((_, i) => {
    const chord = loop[i % loop.length] ?? 0
    const { ids, top } = bestOf(g, i)
    const { band, ninth } = ids.length ? bandOf(g, i, top) : { band: 1 as Band, ninth: false }
    const tones: Tone[] = ids.map((p) => ({
      playerId: p,
      voice: voice(p),
      band,
      ...(ninth ? { ninth: true } : {}),
    }))
    // Moments, most telling first; at most one lick per beat.
    const sole = ids.length === 1 ? (ids[0] ?? null) : null
    streak = sole && sole === streakOf ? streak + 1 : sole ? 1 : 0
    streakOf = sole
    const before = totalsAt(g, i)
    const after = totalsAt(g, i + 1)
    const lick = (kind: Lick, p: string): Beat['lick'] => ({ kind, playerId: p, voice: voice(p) })
    let l: Beat['lick']
    const toMatch = g.playerIds.find(
      (p) =>
        !matched.has(p) &&
        nearTarget(g, after[p] ?? 0) &&
        !nearTarget(g, before[p] ?? 0) &&
        !g.lowWins,
    )
    if (toMatch) {
      matched.add(toMatch)
      l = lick('suspension', toMatch)
    } else {
      const now = soleLeaderAt(g, i + 1)
      const was = i >= 1 ? soleLeaderAt(g, i) : null
      if (i >= 1 && now && now !== was) l = lick('turnaround', now)
      else if (sole && streak >= 3 && streak % 3 === 0) l = lick('hammer', sole)
      else if (g.goal !== 'wins' && !g.lowWins) {
        const r = g.rounds[i]
        const zero = g.playerIds.filter((p) => (r?.scores[p] ?? 0) === 0)
        const bust = zero.length === 1 ? zero[0] : undefined
        if (bust && g.playerIds.length >= 2) l = lick('slide', bust)
      }
    }
    return { chord, tones, ...(l ? { lick: l } : {}) }
  })
  const winner = g.completedAt && g.winnerId ? g.winnerId : null
  const o = outcome ?? ROUTINE
  const runnerUp = outcome?.runnerUp ?? null
  return {
    key,
    riff: riffOf(g),
    beats,
    ...(winner
      ? {
          coda: {
            story: o.story,
            streak: o.streak,
            seal: o.seal,
            strength: o.strength,
            voice: voice(winner),
            color: colorOf(winner),
            answer: runnerUp ? voice(runnerUp) : null,
            winner,
            runnerUp,
          },
        }
      : {}),
  }
}

/** One sounding note. `part` picks the timbre; `beat` is the round it belongs to (-1 intro). */
export interface SongNote {
  t: number
  midi: number
  dur: number
  part: 'lead' | 'lick' | 'bass' | 'riff' | 'story' | 'harmony' | 'chord' | 'answer' | 'seal'
  beat: number
  /** Whose note it is (a player id), for the staff's colours; the riff and the bass are nobody's. */
  who?: string
  /** Loudness, 0–1 (a bigger round, the story's swell); 1 when absent. */
  v?: number
}
export interface Schedule {
  notes: SongNote[]
  /** When each round's beat starts (for the playhead). */
  beatTimes: number[]
  /** When the last note ends. */
  length: number
}

/** Seconds per beat for a song of `n` rounds: the fixed tempo, tighter for long games. */
export function beatLength(n: number): number {
  return Math.max(SONG_RULES.minBeat, Math.min(SONG_RULES.beat, SONG_RULES.body / Math.max(1, n)))
}

/** A voice's chord tone over `chord`, in `band`, as a scale-degree index. */
const toneDegree = (chord: number, v: Voice, band: number) => chord + VOICE_STEP[v] + 7 * band

function beatNotes(key: SongKey, b: Beat, i: number, t: number, len: number): SongNote[] {
  const out: SongNote[] = []
  const m = (n: number) => degreeMidi(key, n)
  // The bass keeps time under every beat, rests included: the chord's root two octaves down.
  out.push({ t, midi: m(b.chord) - 12, dur: len * 0.9, part: 'bass', beat: i })
  const seen = new Set<number>()
  for (const tone of b.tones) {
    const n = toneDegree(b.chord, tone.voice, tone.band)
    if (seen.has(n)) continue
    seen.add(n)
    if (tone.ninth)
      out.push({
        t,
        midi: m(b.chord + 1 + 7 * 2),
        dur: len * 0.18,
        part: 'lick',
        beat: i,
        who: tone.playerId,
      })
    // Round rhythm (the Chime Lab's 06): a bigger round rings longer and louder.
    const weight = (tone.band + (tone.ninth ? 1 : 0)) / 3
    out.push({
      t: tone.ninth ? t + len * 0.18 : t,
      midi: m(n),
      dur: len * (0.45 + 0.5 * weight),
      part: 'lead',
      beat: i,
      v: 0.7 + 0.3 * weight,
      who: tone.playerId,
    })
  }
  if (b.lick) {
    const band = b.tones.find((x) => x.playerId === b.lick?.playerId)?.band ?? 1
    const n = toneDegree(b.chord, b.lick.voice, band)
    const q = len / 4
    const run =
      b.lick.kind === 'turnaround'
        ? [n - 1, n] // a step below, then up to it: "here I come"
        : b.lick.kind === 'hammer'
          ? [n, n, n, n + 7]
          : b.lick.kind === 'slide'
            ? [n, n - 1, n - 2]
            : [b.chord + 3 + 7 * band, b.chord + 2 + 7 * band] // the fourth, resolving to the third
    const at = b.lick.kind === 'hammer' ? 0 : len / 2
    const step = b.lick.kind === 'hammer' ? q * 0.75 : q
    run.forEach((d, k) => {
      out.push({
        t: t + at + k * step,
        midi: m(d),
        dur: step * 0.9,
        part: 'lick',
        beat: i,
        who: b.lick?.playerId,
      })
    })
  }
  return out
}

/** Lay the song out in time: the riff, a beat per round, then the coda. */
export function scheduleOf(song: Song): Schedule {
  const { key } = song
  const step = SONG_RULES.step
  const len = beatLength(song.beats.length)
  const notes: SongNote[] = song.riff.map((n, k) => ({
    t: k * step,
    midi: degreeMidi(key, n),
    dur: step * 0.9,
    part: 'riff' as const,
    beat: -1,
  }))
  let t = song.riff.length * step + step
  const beatTimes: number[] = []
  song.beats.forEach((b, i) => {
    beatTimes.push(t)
    notes.push(...beatNotes(key, b, i, t, len))
    t += len
  })
  if (song.coda) {
    const c = codaOf(key, song.coda)
    const at = (n: SongNote): SongNote => ({ ...n, t: n.t + t, beat: song.beats.length })
    notes.push(...c.story.map(at), ...c.chord.map(at), ...c.seal.map(at))
  }
  const length = notes.reduce((e, n) => Math.max(e, n.t + n.dur), 0)
  return { notes, beatTimes, length }
}

/** The routine tag: three notes landing on the winner's own part, so every win of theirs ends alike. */
const SIGNATURE: Record<Voice, number[]> = { root: [4, 2, 0], third: [0, 4, 2], fifth: [2, 0, 4] }
/**
 * The other stories' motifs (the Chime Lab's 04 and 07): [scale degree from the tonic, length in
 * steps]. Each has its own rhythm as well as its own pitches, so they're told apart at a glance:
 * a fanfare is long-short-short-long, a defence repeats itself, a comeback starts slow and low.
 */
const MOTIF: Record<Exclude<Story, 'routine'>, [number, number][]> = {
  comeback: [
    [-3, 1.5],
    [-4, 1],
    [-2, 0.5],
    [2, 1],
    [7, 2.5],
  ], // sinks under the root, then leaps
  first: [
    [0, 1],
    [2, 1],
    [4, 1],
    [7, 2.5],
  ], // a plain rising arpeggio, evenly
  upset: [
    [2, 1],
    [1, 1],
    [0, 1],
    [7, 0.5],
    [9, 2.5],
  ], // falls, then vaults
  new: [
    [0, 1.5],
    [4, 0.5],
    [7, 0.5],
    [9, 1],
    [11, 2.5],
  ], // a fanfare: long, short, short, long
  defend: [
    [7, 1],
    [7, 1],
    [7, 1],
    [11, 2.5],
  ], // steady, steady, steady, up
}
/** The streak stack (the Chime Lab's 05): root, fifth, third, seventh, ninth. */
const STACK = [0, 4, 9, 13, 15]
/**
 * Each player's signature colour on top of the winning chord (the Chime Lab's 01), from their
 * palette index: add9, 6th, 7th, or a 4th over the 3rd. All in the key.
 */
const COLOUR = [8, 12, 13, 10]

export interface Coda {
  /** The cadence and the story's motif. */
  story: SongNote[]
  /** The streak, stacked and rolled, with the winner's colour on top. */
  chord: SongNote[]
  /** How close it was: a photo finish's answer and suspension, a decisive fifth, a steamroller's bloom. */
  seal: SongNote[]
  /** From the coda's start to its last note's end. */
  length: number
}

/**
 * The ending, from how the game was won (decision 29): three slots so each fact is heard on its
 * own, on the app's own recipe (`win`, `start`, `deal`): a square melody over a triangle line an
 * octave down, a rolled chord, a high triangle sparkle. Story: V → I, then one motif with its own
 * rhythm (the routine one is the winner's signature, walking up into it for a stronger win).
 * Chord: the winner's streak stacked, their colour on top. Seal: a photo finish has the runner-up
 * answer under a 4th that resolves to the 3rd; a decisive win rings a fifth; a steamroller blooms.
 * All diatonic; times from 0 (`scheduleOf` places it after the rounds).
 */
export function codaOf(key: SongKey, f: CodaFacts): Coda {
  const m = (n: number) => degreeMidi(key, n)
  const step = SONG_RULES.story
  const who = f.winner ? { who: f.winner } : {}
  const story: SongNote[] = []
  // V → I: the cadence every ending opens with.
  story.push({ t: 0, midi: m(4) - 12, dur: 0.22, part: 'bass', beat: 0 })
  story.push({ t: 0, midi: m(4 + 7), dur: 0.22, part: 'story', beat: 0, ...who })
  let motif: [number, number][]
  if (f.story === 'routine') {
    // Score Climb (the Chime Lab's 02): a stronger win walks up into the signature.
    const sig = SIGNATURE[f.voice]
    const extra = f.strength >= 0.66 ? 2 : f.strength >= 0.33 ? 1 : 0
    const first = sig[0] ?? 0
    const climb: [number, number][] = Array.from({ length: extra }, (_, k) => [
      first - (extra - k),
      0.5,
    ])
    motif = [...climb, [sig[0] ?? 0, 1], [sig[1] ?? 0, 1], [sig[2] ?? 0, 2.5]]
  } else motif = MOTIF[f.story]
  let t = 0.26
  for (const [d, len] of motif) {
    const dur = len * step * 0.92
    // Two voices, like `win`: the melody in square, the same line an octave down in triangle.
    story.push({ t, midi: m(d + 7), dur, part: 'story', beat: 0, ...who })
    story.push({ t, midi: m(d), dur, part: 'harmony', beat: 0, ...who })
    t += len * step
  }
  const tc = t
  const hold = 0.45
  const chord: SongNote[] = [{ t: tc, midi: m(0) - 12, dur: hold + 0.2, part: 'bass', beat: 0 }]
  const n = Math.max(1, Math.min(STACK.length, f.streak))
  const roll = 0.05 // `start`'s run, quicker
  const tones = [...STACK.slice(0, n), COLOUR[((f.color % 4) + 4) % 4] ?? 8]
  tones.forEach((d, k) => {
    chord.push({
      t: tc + k * roll,
      midi: m(d + 7),
      dur: hold + 0.2 - k * roll,
      part: 'chord',
      beat: 0,
      // A bigger stack sounds as full as a small one, not louder.
      v: k === tones.length - 1 ? 1 : 1 / Math.sqrt(n),
      ...who,
    })
  })
  const ts = tc + tones.length * roll
  const seal: SongNote[] = []
  if (f.seal === 'photo') {
    // Call & answer (10): the runner-up answers a step below their own part, then lands on it.
    if (f.answer) {
      const a = VOICE_STEP[f.answer]
      const by = f.runnerUp ? { who: f.runnerUp } : {}
      seal.push({ t: tc, midi: m(a - 1), dur: 0.18, part: 'answer', beat: 0, ...by })
      seal.push({ t: tc + 0.18, midi: m(a), dur: hold, part: 'answer', beat: 0, ...by })
    }
    // The squeak (03/09): a 4th held over the chord, resolving to the 3rd (a semitone in major).
    seal.push({ t: ts, midi: m(3 + 14), dur: 0.18, part: 'seal', beat: 0, ...who })
    seal.push({ t: ts + 0.18, midi: m(2 + 14), dur: 0.32, part: 'seal', beat: 0, ...who })
  } else if (f.seal === 'decisive') {
    // The margin as an interval (03): a clean fifth rings over the chord.
    seal.push({ t: ts, midi: m(4 + 14), dur: 0.3, part: 'seal', beat: 0, ...who })
  } else {
    // The bloom: `deal`'s sparkle, an octave and a third over the top.
    seal.push({ t: ts, midi: m(21), dur: 0.26, part: 'seal', beat: 0, ...who })
    seal.push({ t: ts + 0.08, midi: m(23), dur: 0.3, part: 'seal', beat: 0, ...who })
  }
  const length = [...story, ...chord, ...seal].reduce((e, x) => Math.max(e, x.t + x.dur), 0)
  return { story, chord, seal, length }
}

/** Just round `i`: its chord tone(s), its lick and the bass, from 0 (the submit sound, a preview). */
export function roundNotes(song: Song, i: number): SongNote[] {
  const b = song.beats[i]
  if (!b) return []
  return beatNotes(song.key, b, i, 0, SONG_RULES.beat)
}

/** Every pitch class in the key (for tests and the docs). */
export function scaleOf(key: SongKey): number[] {
  return SCALE[key.mode].map((s) => (s + key.tonic) % 12)
}
/** The chord's three pitch classes. */
export function chordOf(key: SongKey, chord: number): number[] {
  return [0, 2, 4].map((s) => degreeMidi(key, chord + s) % 12)
}

/** A note as the staff plots it: when, how long, how high, whose colour, and what kind. */
export interface PlotNote {
  t: number
  dur: number
  midi: number
  color: number | null
  kind: 'melody' | 'riff' | 'bass' | 'coda'
  beat: number
}

const KIND: Record<SongNote['part'], PlotNote['kind']> = {
  lead: 'melody',
  lick: 'melody',
  riff: 'riff',
  bass: 'bass',
  story: 'coda',
  harmony: 'coda',
  chord: 'coda',
  answer: 'coda',
  seal: 'coda',
}

/** Every note of a song for the staff: the riff, each round, the bass and the coda, in time order. */
export function plotOf(sched: Schedule, colorOf: ColorOf): PlotNote[] {
  return sched.notes
    .map((n) => ({
      t: n.t,
      dur: n.dur,
      midi: n.midi,
      color: n.who ? colorOf(n.who) : null,
      kind: KIND[n.part],
      beat: n.beat,
    }))
    .sort((a, b) => a.t - b.t || a.midi - b.midi)
}

/**
 * What a key sounds like, for the key picker (Settings › Games): `chord` rolls the tonic chord
 * up over its root (a key, or major against minor); `loop` plays the loop's four chords in turn,
 * the harmony every fox trot in that key will walk through.
 */
export function keyPreview(key: SongKey, what: 'chord' | 'loop'): SongNote[] {
  const m = (n: number) => degreeMidi(key, n)
  const chord = (root: number, t: number, len: number): SongNote[] => [
    { t, midi: m(root) - 12, dur: len, part: 'bass', beat: 0 },
    ...[0, 2, 4].map((s, k) => ({
      t: t + k * 0.05,
      midi: m(root + s + 7),
      dur: len - k * 0.05,
      part: 'chord' as const,
      beat: 0,
    })),
  ]
  if (what === 'chord') return chord(0, 0, 0.5)
  const loop = LOOPS[key.mode][key.loop] ?? LOOPS[key.mode][0]
  return loop.flatMap((root, i) => chord(root, i * 0.24, 0.24))
}
