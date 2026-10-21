export interface SplashProps {
  /** The launch art's URL (`splash-art.webp`, cut by `pnpm icons`). */
  art: string
  /** Words (the app's copy): the tagline, the loading line and the screen's name. */
  tagline: string
  loading: string
  label: string
  /** Leaving: it fades away (the shell adds this, then removes it). */
  out?: boolean
}

/**
 * The launch screen (decision 28): the fox with its cards on the splash art's own dark ground,
 * a tagline, and a jade bar that fills. Rendered into the static page so it paints before any
 * script; the art sits where the iOS launch image has it, so launch → splash → app never jumps.
 * Brand art, like the icon: the same in both themes.
 */
export function Splash({ art, tagline, loading, label, out = false }: SplashProps) {
  return (
    <div id="splash" className={out ? 'splash out' : 'splash'} role="status" aria-label={label}>
      <div className="splash-art">
        <img src={art} alt="" width={680} height={760} fetchPriority="high" decoding="sync" />
      </div>
      <div className="splash-foot" aria-hidden="true">
        <p className="splash-tagline">{tagline}</p>
        <div className="splash-bar">
          <i />
        </div>
        <p className="splash-loading">{loading}</p>
      </div>
    </div>
  )
}
