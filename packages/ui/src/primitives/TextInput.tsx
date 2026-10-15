import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from '../cx'

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>

/** The sunk text field; jade ring on focus. Takes every input prop. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, type = 'text', ...rest },
  ref,
) {
  return <input ref={ref} type={type} className={cx('input', className)} {...rest} />
})
