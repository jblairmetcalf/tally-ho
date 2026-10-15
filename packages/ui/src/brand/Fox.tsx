import { cx } from '../cx'

export interface FoxProps {
  /** Wear the crown (it drops in with a spring). */
  crown?: boolean
  /** Wink the right eye once on mount. */
  wink?: boolean
  /** Twitch the ears once on mount. Re-key the Fox to twitch again. */
  twitch?: boolean
  className?: string
}

const STROKE = { stroke: '#13112E', strokeWidth: 2.5, strokeLinejoin: 'round' as const }

/** The mascot, drawn from the app icon. Blinks every few seconds. Brand art: raw colour allowed. */
export function Fox({ crown = false, wink = false, twitch = false, className }: FoxProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={cx('fox', wink && 'wink', twitch && 'twitch', className)}
      aria-hidden="true"
    >
      <g className="ear-l">
        <path d="M12 66 L25 14 L54 42 Z" fill="#FF6A1F" />
        <path d="M22 56 L28 27 L46 44 Z" fill="#F7E9D2" />
      </g>
      <g className="ear-r">
        <path d="M108 66 L95 14 L66 42 Z" fill="#FF6A1F" />
        <path d="M98 56 L92 27 L74 44 Z" fill="#F7E9D2" />
      </g>
      <path
        d="M6 72 C12 47 35 37 60 37 C85 37 108 47 114 72 C101 76 93 83 86 92 L60 110 L34 92 C27 83 19 76 6 72 Z"
        fill="#FF6A1F"
      />
      <path
        d="M6 72 C21 71 33 77 44 85 C50 81 55 79 60 79 C65 79 70 81 76 85 C87 77 99 71 114 72 C106 82 97 90 85 98 L60 112 L35 98 C23 90 14 82 6 72 Z"
        fill="#F7E9D2"
      />
      <path d="M60 37 L52 50 L60 60 L68 50 Z" fill="#E85A12" opacity=".7" />
      <g className="eyes">
        <path d="M34 66 C38 56 49 55 54 64 C49 69 39 70 34 66 Z" fill="#13112E" />
        <circle cx="47" cy="62" r="2.1" fill="#fff" />
      </g>
      <g className="eye-r">
        <path d="M86 66 C82 56 71 55 66 64 C71 69 81 70 86 66 Z" fill="#13112E" />
        <circle cx="77" cy="62" r="2.1" fill="#fff" />
      </g>
      <path d="M52 87 Q60 83 68 87 Q64 95 60 96 Q56 95 52 87 Z" fill="#13112E" />
      <path
        d="M48 100 Q54 105 60 99 Q66 105 74 98"
        fill="none"
        stroke="#13112E"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {crown && (
        <g className="crown-g">
          <path d="M41 33 L45 13 L53 24 L60 7 L67 24 L75 13 L79 33 Z" fill="#FFB800" {...STROKE} />
          <circle cx="45" cy="12" r="3.4" fill="#FFB800" {...STROKE} strokeWidth={2} />
          <circle cx="60" cy="6" r="3.4" fill="#FFB800" {...STROKE} strokeWidth={2} />
          <circle cx="75" cy="12" r="3.4" fill="#FFB800" {...STROKE} strokeWidth={2} />
        </g>
      )}
    </svg>
  )
}
