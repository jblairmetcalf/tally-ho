/**
 * Named haptic patterns. Android/Chrome use the Vibration API. iOS Safari has no Vibration API,
 * but since iOS 18 toggling an `<input type="checkbox" switch>` plays the system "tick", so on
 * iOS each pattern becomes one tick per pulse (spaced like the pattern). Off when prefs say so.
 */

export const HAPTICS = {
  tap: 8,
  pick: 10,
  submit: 12,
  add: [8, 30, 8],
  /** New game's tune: three light taps on the hook. */
  deal: [8, 60, 8, 60, 14],
  lead: [10, 40, 10],
  match: [14, 50, 14, 50, 14],
  error: [40, 30, 40],
  del: 25,
  win: [30, 60, 30, 60, 90],
} satisfies Record<string, number | number[]>
export type HapticCue = keyof typeof HAPTICS

let enabled = true
let iosSwitch: HTMLLabelElement | null = null

function iosTick() {
  if (typeof document === 'undefined') return
  if (!iosSwitch) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    document.body.appendChild(label)
    iosSwitch = label
  }
  iosSwitch.click()
}

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export const Haptics = {
  setEnabled(on: boolean) {
    enabled = on
  },
  play(cue: HapticCue | number | number[]) {
    if (!enabled) return
    const pattern = typeof cue === 'string' ? HAPTICS[cue] : cue
    try {
      if (canVibrate()) {
        navigator.vibrate(pattern)
        return
      }
      // iOS: one tick per pulse, spaced by the pattern's gaps. Ticks only fire inside a user
      // gesture, so later pulses in a pattern are best-effort.
      const pulses = Array.isArray(pattern) ? pattern : [pattern]
      let at = 0
      pulses.forEach((ms, i) => {
        if (i % 2 === 0) setTimeout(iosTick, at)
        at += ms
      })
    } catch {
      /* haptics are a courtesy */
    }
  },
}
