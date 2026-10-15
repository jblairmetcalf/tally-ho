import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../cx'

export interface CardProps {
  as?: 'section' | 'div'
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/** The basic surface: a rounded panel one step up from the page. */
export function Card({ as: Tag = 'div', className, style, children }: CardProps) {
  return (
    <Tag className={cx('card', className)} style={style}>
      {children}
    </Tag>
  )
}

export interface NoticeProps {
  children: ReactNode
  /** A small button on the right ("Clear"). */
  action?: ReactNode
}

/** A dashed lavender note ("These are sample games…"). */
export function Notice({ children, action }: NoticeProps) {
  return (
    <div className="notice">
      <p>{children}</p>
      {action}
    </div>
  )
}

interface TextProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/** Small uppercase label above a group ("Players", "How does it end?"). */
export function Eyebrow({ children, className, style }: TextProps) {
  return (
    <span className={cx('eyebrow', className)} style={style}>
      {children}
    </span>
  )
}

/** A card or section heading in the display face (h2.sec). */
export function SectionTitle({ children, className, style }: TextProps) {
  return (
    <h2 className={cx('sec', className)} style={style}>
      {children}
    </h2>
  )
}
