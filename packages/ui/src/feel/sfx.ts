/**
 * The prototype's 8-bit sound design, verbatim: a tiny Web Audio synth with one function per cue.
 * Nothing is loaded from the network.
 *
 * Making it "just work" on iOS:
 *   · The audio session is `ambient` (Safari 17+ `navigator.audioSession`): sound effects mix
 *     with music already playing instead of stopping it — what native games do. The trade-off
 *     iOS imposes on every mixing app: the Ring/Silent switch mutes them.
 *   · Audio can only start inside a real gesture (touchend / click / keydown — not pointerdown).
 *     The app calls `SFX.unlock()` on every one; it is a no-op while audio is running.
 *   · Resuming an AudioContext after iOS backgrounds the app is unreliable, so on the way out
 *     (`SFX.sleep()`, on page hide) the context is closed, and the next gesture builds a fresh
 *     one — synchronously, inside the gesture, where iOS allows it.
 *   · Muted means no context at all, so a muted Tally Ho! never touches the audio session.
 */

type Wave = OscillatorType
interface ToneOpts {
  type?: Wave
  vol?: number
  at?: number
  to?: number | null
}

let ctx: AudioContext | null = null
let muted = false

type AudioSessionType =
  | 'auto'
  | 'playback'
  | 'transient'
  | 'transient-solo'
  | 'ambient'
  | 'play-and-record'

/** Mix with other apps' audio (and never interrupt their music). Must be set before audio starts. */
function mixWithOthers() {
  if (typeof navigator === 'undefined') return
  const session = (navigator as Navigator & { audioSession?: { type: AudioSessionType } })
    .audioSession
  if (!session || session.type === 'ambient') return
  try {
    session.type = 'ambient'
  } catch {
    /* read-only in some builds: iOS's default for web audio mixes too */
  }
}
mixWithOthers()

const AudioCtor = (): typeof AudioContext | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)

/** A fresh context, primed with a one-sample silent buffer (what actually unlocks WebKit). */
function create(): AudioContext | null {
  const A = AudioCtor()
  if (!A) return null
  mixWithOthers()
  try {
    const c = new A()
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination)
    src.start(0)
    if (c.state !== 'running') c.resume().catch(() => {})
    return c
  } catch {
    return null
  }
}

function close() {
  const c = ctx
  ctx = null
  c?.close().catch(() => {})
}

function tone(f: number, d: number, o: ToneOpts = {}): void {
  if (muted) return
  // Normally unlock() (from the same gesture) already made a running context. Cues fired by
  // timers (lead change, fanfare) reuse it; if there is none yet, try — it may stay silent.
  if (!ctx || ctx.state === 'closed') ctx = create()
  const c = ctx
  if (!c) return
  if (c.state !== 'running') c.resume().catch(() => {})
  const { type = 'square', vol = 0.12, at = 0, to = null } = o
  const t = c.currentTime + at + 0.01
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + d)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t)
  osc.stop(t + d + 0.03)
}

/** A run of notes; 0 is a rest. */
function seq(notes: number[], step: number, o: ToneOpts = {}): void {
  notes.forEach((f, i) => {
    if (f) tone(f, step * 0.92, { ...o, at: (o.at ?? 0) + i * step })
  })
}

export const SFX = {
  /** The sound toggle. Muting releases the audio entirely; unmuting waits for the next tap. */
  setMuted(m: boolean) {
    muted = m
    if (m) close()
  },
  isMuted: () => muted,
  /**
   * Call from every real user gesture (touchend, click, keydown). Builds a running context if
   * there isn't one — the only moment iOS reliably allows it. A no-op while audio runs.
   */
  unlock() {
    if (muted) return
    // Safari's extra state (a call, Siri, another app's audio) isn't in the DOM typings.
    const state = ctx?.state as AudioContextState | 'interrupted' | undefined
    if (state === 'running') return
    if (ctx && state === 'suspended') {
      // Created moments ago (touchend → click of one tap) or paused: resuming in a gesture works.
      ctx.resume().catch(() => {})
      return
    }
    close()
    ctx = create()
  },
  /** Call when the app is hidden: release the audio so the next gesture starts clean. */
  sleep() {
    close()
  },
  /** A key press, a nav tap. */
  tap: () => tone(1046, 0.035, { vol: 0.06 }),
  /** Choosing a pill, resuming. */
  pick: () => {
    tone(784, 0.05, { vol: 0.09 })
    tone(1175, 0.07, { vol: 0.09, at: 0.05 })
  },
  /** A sheet slides up. */
  open: () => tone(240, 0.2, { type: 'triangle', to: 960, vol: 0.16 }),
  /** A sheet slides away. */
  close: () => tone(820, 0.16, { type: 'triangle', to: 210, vol: 0.12 }),
  /** A player joins. */
  add: () => seq([659, 988], 0.06, { vol: 0.1 }),
  /** A player leaves. */
  remove: () => tone(440, 0.14, { to: 110, vol: 0.1 }),
  /** A round is scored. */
  submit: () => seq([523, 659, 784, 1047], 0.065, { vol: 0.11 }),
  /** Deal in: a new game starts. */
  start: () => {
    seq([392, 523, 659, 784, 1047], 0.08, { vol: 0.11 })
    seq([196, 262, 330, 392, 523], 0.08, { type: 'triangle', vol: 0.1 })
  },
  /** Someone takes the lead. */
  lead: () => seq([1319, 0, 1568, 2093], 0.07, { vol: 0.09 }),
  /** Someone reaches match point. */
  match: () => seq([330, 0, 330, 440], 0.09, { type: 'triangle', vol: 0.16 }),
  /** Tied at the top: tiebreak. */
  tie: () => seq([523, 494, 523, 494, 523], 0.07, { vol: 0.09 }),
  /** Nope. */
  error: () => tone(196, 0.22, { type: 'sawtooth', to: 98, vol: 0.1 }),
  /** Something is deleted. */
  del: () => tone(330, 0.3, { type: 'sawtooth', to: 55, vol: 0.1 }),
  /** The fanfare. */
  win: () => {
    seq([523, 659, 784, 1047, 0, 784, 1047, 1319, 1319, 1319], 0.1, { vol: 0.13 })
    seq([262, 330, 392, 523, 0, 392, 523, 659, 659, 659], 0.1, { type: 'triangle', vol: 0.12 })
  },
  /** The sad trombone, for whoever came last. */
  lose: () => seq([392, 370, 349, 311], 0.26, { type: 'triangle', vol: 0.12 }),
}

export type SfxCue = Exclude<keyof typeof SFX, 'setMuted' | 'isMuted' | 'unlock' | 'sleep'>
export const SFX_CUES: SfxCue[] = [
  'tap',
  'pick',
  'open',
  'close',
  'add',
  'remove',
  'submit',
  'start',
  'lead',
  'match',
  'tie',
  'error',
  'del',
  'win',
  'lose',
]
