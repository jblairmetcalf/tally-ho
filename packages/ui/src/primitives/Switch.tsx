import type { ReactNode } from 'react'

export interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** The accessible name. */
  label: string
}

/** A chunky on/off toggle; the knob springs across. */
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  )
}

export interface SettingProps {
  title: string
  hint?: string
  /** The control on the right (a Switch, a Segmented…). */
  children?: ReactNode
}

/** One row of a settings list: title and hint on the left, the control on the right. */
export function Setting({ title, hint, children }: SettingProps) {
  return (
    <div className="setting">
      <div className="label">
        <b>{title}</b>
        {hint && <span className="hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
