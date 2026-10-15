/**
 * The prototype's 8-bit sound design, verbatim: a tiny Web Audio synth with one function per cue.
 * Nothing is loaded from the network.
 *
 * iOS needs care, all handled here:
 *   · Audio may only start inside a real gesture (touchend / click / keydown — not pointerdown).
 *     The app calls `SFX.unlock()` on every such gesture; the first one also plays a one-sample
 *     silent buffer, which is what actually unlocks WebKit's audio.
 *   · A backgrounded PWA comes back with its context `interrupted` (not just `suspended`), so
 *     anything other than `running` is resumed, and notes are scheduled only once it runs.
 *   · The Ring/Silent switch mutes web audio unless the audio session is `playback`
 *     (`navigator.audioSession`, Safari 17+). `setPlayInSilent` chooses.
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
let unlocked = false
let playInSilent = true

/** Safari 17+: how the page's audio mixes with the system and the Ring/Silent switch. */
type AudioSessionType =
  | 'auto'
  | 'playback'
  | 'transient'
  | 'transient-solo'
  | 'ambient'
  | 'play-and-record'
const audioSession = (): { type: AudioSessionType } | undefined =>
  typeof navigator === 'undefined'
    ? undefined
    : (navigator as Navigator & { audioSession?: { type: AudioSessionType } }).audioSession

function applySession() {
  const session = audioSession()
  if (!session) return
  try {
    session.type = playInSilent ? 'playback' : 'ambient'
  } catch {
    /* read-only in some builds */
  }
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx || ctx.state === 'closed') {
    const A =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!A) return null
    applySession()
    ctx = new A()
    unlocked = false
  }
  // 'suspended' before the first gesture, 'interrupted' after iOS backgrounds the app.
  if (ctx.state !== 'running') ctx.resume().catch(() => {})
  return ctx
}

/** Run `fn` once the context is actually running (iOS resumes asynchronously). */
function whenRunning(c: AudioContext, fn: () => void) {
  if (c.state === 'running') fn()
  else
    c.resume()
      .then(() => {
        if (c.state === 'running') fn()
      })
      .catch(() => {})
}

function tone(f: number, d: number, o: ToneOpts = {}): void {
  if (muted) return
  const c = ac()
  if (!c) return
  whenRunning(c, () => play(c, f, d, o))
}

function play(c: AudioContext, f: number, d: number, o: ToneOpts): void {
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
  setMuted(m: boolean) {
    muted = m
  },
  isMuted: () => muted,
  /**
   * Play through the iPhone's Ring/Silent switch (Safari 17+). On: sounds always play, and
   * music from other apps pauses while they do. Off: the iOS default — silent means silent.
   */
  setPlayInSilent(on: boolean) {
    playInSilent = on
    applySession()
  },
  /** True where the Ring/Silent behaviour can be chosen (iOS Safari 17+). */
  canPlayInSilent: () => !!audioSession(),
  /** Call from a real user gesture (touchend, click, keydown). Safe to call on every one. */
  unlock() {
    const c = ac()
    if (!c || unlocked) return
    try {
      const src = c.createBufferSource()
      src.buffer = c.createBuffer(1, 1, 22050)
      src.connect(c.destination)
      src.start(0)
      unlocked = true
    } catch {
      /* try again on the next gesture */
    }
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

export type SfxCue = Exclude<
  keyof typeof SFX,
  'setMuted' | 'isMuted' | 'unlock' | 'setPlayInSilent' | 'canPlayInSilent'
>
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
