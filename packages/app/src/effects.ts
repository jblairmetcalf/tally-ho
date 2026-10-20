import { type BurstOpts, FX, type HapticCue, Haptics, SFX, type SfxCue } from '@tally/ui'

/**
 * The side effects the store's actions trigger: sounds, haptics, confetti, timers, scrolling.
 * Kept apart from the state transitions so the store reads like the prototype's App, and so
 * stories and tests can run the same logic silently.
 */
export interface Effects {
  /** Play a sound cue (and its haptic, when the cue has one worth feeling). */
  play(cue: SfxCue): void
  /** Mute or unmute the synth at once (prefs follow). */
  mute(m: boolean): void
  /** A haptic on its own (the prototype's `vibrate`). */
  buzz(cue: HapticCue): void
  /** Suit confetti from an element (the button that was pressed). */
  burstFrom(el: Element | null | undefined, n: number, o?: BurstOpts): void
  /** Run later. Tracked so `dispose` can cancel it. */
  later(ms: number, fn: () => void): void
  /** Run later, replacing any pending timer with the same name (toast, banner). */
  timer(name: string, ms: number, fn: () => void): void
  /** Back to the top of the page on a screen change. */
  scrollTop(): void
  dispose(): void
}

/**
 * Cues that also buzz. The prototype vibrated on `submit` and `win`; the moments that matter
 * as much (lead change, match point, an error, a delete) buzz too.
 */
const FELT: Partial<Record<SfxCue, HapticCue>> = {
  submit: 'submit',
  deal: 'deal',
  win: 'win',
  lead: 'lead',
  match: 'match',
  error: 'error',
  del: 'del',
}

export function createEffects(opts: { silent?: boolean; scroll?: boolean } = {}): Effects {
  const { silent = false, scroll = true } = opts
  const pending = new Set<ReturnType<typeof setTimeout>>()
  const named = new Map<string, ReturnType<typeof setTimeout>>()

  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      pending.delete(id)
      fn()
    }, ms)
    pending.add(id)
  }

  return {
    play(cue) {
      if (silent) return
      try {
        SFX[cue]()
      } catch {
        /* no audio */
      }
      const h = FELT[cue]
      if (h) Haptics.play(h)
    },
    mute(m) {
      SFX.setMuted(m)
    },
    buzz(cue) {
      if (!silent) Haptics.play(cue)
    },
    burstFrom(el, n, o) {
      if (!silent) FX.fromEl(el, n, o)
    },
    later,
    timer(name, ms, fn) {
      const prev = named.get(name)
      if (prev) clearTimeout(prev)
      const id = setTimeout(() => {
        named.delete(name)
        fn()
      }, ms)
      named.set(name, id)
    },
    scrollTop() {
      if (!scroll || typeof window === 'undefined') return
      try {
        window.scrollTo({ top: 0 })
      } catch {
        /* jsdom */
      }
    },
    dispose() {
      for (const id of pending) clearTimeout(id)
      for (const id of named.values()) clearTimeout(id)
      pending.clear()
      named.clear()
    },
  }
}
