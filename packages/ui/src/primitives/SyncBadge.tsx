import { Icon } from '../brand/Icon'
import { cx } from '../cx'

/** Mirrors the app's `SyncState` (ui has no store, so it carries its own copy of the union). */
export type SyncBadgeState = 'synced' | 'pending' | 'offline' | 'error'

/** The accessible name for each state; tapping the badge announces it as a toast. */
export const SYNC_LABELS: Record<SyncBadgeState, string> = {
  synced: 'Synced',
  pending: 'Saved on this phone · syncing',
  offline: 'Offline · saved on this phone',
  error: 'Sync problem',
}

export interface SyncBadgeProps {
  state: SyncBadgeState
  /** Tapped: the caller shows `label` as a toast. */
  onClick?: (label: string) => void
  /**
   * A 28px disc that pins to the corner of the header's fox badge (the top bar has no room
   * for a fourth button). Its hit area is still 44px.
   */
  compact?: boolean
  className?: string
}

/**
 * The family-sync status in the header: a 44px icon button. Synced is a quiet jade cloud;
 * pending adds a pulsing amber dot; offline crosses the cloud out; a problem wears a coral dot.
 */
export function SyncBadge({ state, onClick, compact = false, className }: SyncBadgeProps) {
  const label = SYNC_LABELS[state]
  return (
    <button
      type="button"
      aria-label={label}
      data-state={state}
      className={cx('icon-btn sync-badge', compact && 'compact', className)}
      onClick={() => onClick?.(label)}
    >
      <Icon name={state === 'offline' ? 'cloudOff' : 'cloud'} size={compact ? 16 : 22} />
      {(state === 'pending' || state === 'error') && <i className="sync-dot" aria-hidden="true" />}
    </button>
  )
}
