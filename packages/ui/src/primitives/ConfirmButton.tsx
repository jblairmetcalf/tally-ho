import { useState } from 'react'
import type { IconName } from '../brand/Icon'
import { Button } from './Button'

export interface ConfirmButtonProps {
  /** The resting label, e.g. "Delete this game". */
  label: string
  /** The armed label, e.g. "Tap again to delete". */
  armedLabel: string
  icon?: IconName
  /** The second tap. */
  onConfirm: () => void
  /** The first tap: the button arms (fills coral and shakes). The caller plays `SFX.error`. */
  onArm?: () => void
}

/** The coral two-tap destructive button: first tap arms it, the second confirms. */
export function ConfirmButton({
  label,
  armedLabel,
  icon = 'trash',
  onConfirm,
  onArm,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)
  return (
    <Button
      variant="coral"
      block
      armed={armed}
      icon={icon}
      iconSize={20}
      onClick={() => {
        if (armed) onConfirm()
        else {
          onArm?.()
          setArmed(true)
        }
      }}
    >
      {armed ? armedLabel : label}
    </Button>
  )
}
