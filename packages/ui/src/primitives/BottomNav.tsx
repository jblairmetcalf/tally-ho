import { Fox } from '../brand/Fox'
import { Icon } from '../brand/Icon'
import { cx } from '../cx'

export interface BottomNavProps {
  /** The current screen, lit in jade. `null` when neither (e.g. settings). */
  screen: 'home' | 'history' | null
  /** A game is in progress: the FAB returns to it (jade badge) instead of starting one (amber +). */
  live: boolean
  /** Change to make the FAB fox twitch its ears again (after each scored round). */
  foxKey: number
  onHome: () => void
  onHistory: () => void
  onFab: () => void
  /** In flow instead of fixed to the viewport bottom (stories, docs). */
  inline?: boolean
}

/** Glass tab bar with Home, History and the fox FAB in the middle. */
export function BottomNav({
  screen,
  live,
  foxKey,
  onHome,
  onHistory,
  onFab,
  inline = false,
}: BottomNavProps) {
  return (
    <nav className={cx('nav', inline && 'in-flow')} aria-label="Main">
      <div className="nav-inner">
        <button
          type="button"
          className={cx('nav-btn', screen === 'home' && 'on')}
          aria-current={screen === 'home' ? 'page' : undefined}
          onClick={onHome}
        >
          <Icon name="home" />
          Home
        </button>
        <button
          type="button"
          className={cx('fab', live && 'live')}
          onClick={onFab}
          aria-label={live ? 'Back to the game' : 'New game'}
        >
          <Fox twitch key={foxKey} />
          <span className="plus">
            <Icon name={live ? 'cards' : 'plus'} size={16} stroke={3} />
          </span>
        </button>
        <button
          type="button"
          className={cx('nav-btn', screen === 'history' && 'on')}
          aria-current={screen === 'history' ? 'page' : undefined}
          onClick={onHistory}
        >
          <Icon name="scroll" />
          History
        </button>
      </div>
    </nav>
  )
}
