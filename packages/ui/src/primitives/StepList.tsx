import type { ReactNode } from 'react'
import { Icon, type IconName } from '../brand/Icon'

export interface Step {
  /** What to do ("Tap Share in the toolbar"). */
  text: ReactNode
  /** The icon the person will be looking for on screen, shown beside the step. */
  icon?: IconName
}

export interface StepListProps {
  /** The list's accessible name ("How to add it"). */
  label: string
  steps: Step[]
}

/** Numbered how-to steps, each with the on-screen icon to look for. */
export function StepList({ label, steps }: StepListProps) {
  return (
    <ol className="steps" aria-label={label}>
      {steps.map((s, i) => (
        <li key={i} className="step">
          <span className="step-n num" aria-hidden="true">
            {i + 1}
          </span>
          <span className="step-text">{s.text}</span>
          {s.icon && (
            <span className="step-icon" aria-hidden="true">
              <Icon name={s.icon} size={22} />
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
