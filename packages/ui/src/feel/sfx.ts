/**
 * The prototype's 8-bit sound design, verbatim: a tiny Web Audio synth with one function per cue.
 * Nothing is loaded from the network.
 *
 * Making it "just work" on iOS, where web audio has three traps:
 *   · The Ring/Silent switch mutes web audio unless the page's audio session is `playback`
 *     (Safari 17+ `navigator.audioSession`). Most iPhones live on silent, so sounds claim
 *     `playback`. iOS's price for that: music from another app pauses while Tally Ho! plays.
 *     So audio is held only while sounds are actually playing: after IDLE_MS of silence the
 *     context closes and the session goes back to iOS. Muted = no audio session at all.
 *   · Audio can only start inside a gesture. Sounds are created by the tap that plays them
 *     (inside its click handler), so a context is born running. Cues that follow a tap by a
 *     moment (a lead change, the fanfare's sting) reuse that context while it lives.
 *   · iOS interrupts audio when the app is backgrounded; resuming it is unreliable. Leaving the
 *     app closes the context (`SFX.sleep()`); the next sound builds a fresh one.
 */

type Wave = OscillatorType
interface ToneOpts {
  type?: Wave
  vol?: number
  at?: number
  to?: number | null
}

/** How long audio is held after the last note ends before it's handed back to iOS. */
const IDLE_MS = 6000

let ctx: AudioContext | null = null
let muted = false
let idle: ReturnType<typeof setTimeout> | null = null

type AudioSessionType =
  | 'auto'
  | 'playback'
  | 'transient'
  | 'transient-solo'
  | 'ambient'
  | 'play-and-record'

function setSession(type: AudioSessionType) {
  if (typeof navigator === 'undefined') return
  const session = (navigator as Navigator & { audioSession?: { type: AudioSessionType } })
    .audioSession
  if (!session || session.type === type) return
  try {
    session.type = type
  } catch {
    /* read-only in some builds */
  }
}

const AudioCtor = (): typeof AudioContext | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)

function create(): AudioContext | null {
  const A = AudioCtor()
  if (!A) return null
  setSession('playback') // before the context exists: play through the silent switch
  try {
    const c = new A()
    // A one-sample silent buffer: what actually unlocks WebKit's audio inside a gesture.
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

/** Close the context and give the audio session back (music elsewhere may carry on). */
function release() {
  if (idle) clearTimeout(idle)
  idle = null
  const c = ctx
  ctx = null
  if (c) c.close().catch(() => {})
  setSession('auto')
}

/** Hold audio until IDLE_MS after the last note ends. */
function holdUntil(endsAt: number) {
  if (idle) clearTimeout(idle)
  const c = ctx
  const ms = c ? Math.max(0, (endsAt - c.currentTime) * 1000) + IDLE_MS : IDLE_MS
  idle = setTimeout(release, ms)
}

/** A running context, created on demand (inside the tap that wants a sound). */
function live(): AudioContext | null {
  // Safari's extra state (a call, Siri, backgrounding) isn't in the DOM typings.
  const state = ctx?.state as AudioContextState | 'interrupted' | undefined
  if (ctx && (state === 'closed' || state === 'interrupted')) release()
  if (!ctx) ctx = create()
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {})
  return ctx
}

function tone(f: number, d: number, o: ToneOpts = {}): void {
  if (muted) return
  const c = live()
  if (!c) return
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
  holdUntil(t + d + 0.03)
}

/** A run of notes; 0 is a rest. */
function seq(notes: number[], step: number, o: ToneOpts = {}): void {
  notes.forEach((f, i) => {
    if (f) tone(f, step * 0.92, { ...o, at: (o.at ?? 0) + i * step })
  })
}

export const SFX = {
  /** The sound toggle. Muted: audio is released entirely and nothing touches iOS's audio. */
  setMuted(m: boolean) {
    muted = m
    if (m) release()
  },
  isMuted: () => muted,
  /**
   * Call from user gestures (touchend, click, keydown). Wakes a context iOS suspended while it
   * is still held; never creates one (the sound that wants audio does, in the same tap).
   */
  unlock() {
    if (muted || !ctx) return
    const state = ctx.state as AudioContextState | 'interrupted'
    if (state === 'suspended' || state === 'interrupted') ctx.resume().catch(() => {})
  },
  /** Call when the app is hidden: release audio so the next sound starts clean. */
  sleep() {
    release()
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
  /**
   * New game opens: the app's own little tune, about a second. A rising "Tal-ly-Ho!" hook over a
   * walking bass, landing on a held high C with a sparkle on top. The same every time, so it's
   * the sound people remember the app by (decision 23).
   */
  deal: () => {
    const step = 0.085
    // Tal - ly - Ho!   ·   tal - ly - HO!
    seq([523, 659, 784, 0, 659, 784, 1047, 1047], step, { vol: 0.1 })
    seq([262, 0, 330, 0, 392, 0, 523, 523], step, { type: 'triangle', vol: 0.11 })
    tone(2093, 0.22, { type: 'triangle', vol: 0.045, at: step * 6.4 })
    tone(2637, 0.26, { type: 'triangle', vol: 0.035, at: step * 7.2 })
  },
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
  'deal',
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
