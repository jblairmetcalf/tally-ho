import { Chip } from '../brand/Chip'
import { Icon } from '../brand/Icon'
import { cx } from '../cx'

export interface ChampionCardProps {
  /** Everyone tied on the most wins. One = the champion; several = a dead heat. */
  leaders: { name: string; color: number }[]
  /** The leaders' win count. */
  wins: number
  /** Completed games. */
  total: number
  /** The current winning run; shown from 2 in a row. */
  streak?: { name: string; n: number } | null
  className?: string
}

/** Home's hero card: the crowned family champion, or a dead heat. */
export function ChampionCard({ leaders, wins, total, streak, className }: ChampionCardProps) {
  const top = leaders[0]
  const tie = leaders.length > 1
  return (
    <section className={cx('card champ', className)}>
      <Chip
        name={tie || !top ? '=' : top.name}
        color={tie || !top ? 'var(--faint)' : top.color}
        size={64}
        crown={!tie && !!top}
        crownKey={top?.name}
      />
      <div className="relative z-[1] min-w-0">
        <div className="eyebrow">{tie ? 'Dead heat' : 'Family champion'}</div>
        <div className="who">{leaders.map((l) => l.name).join(' & ')}</div>
        <div className="hint text-muted" style={{ fontSize: 13.5, marginTop: 4 }}>
          {wins} of {total} games won
        </div>
        {streak && streak.n >= 2 && (
          <div className="streak">
            <Icon name="flame" size={15} /> {streak.name} has won {streak.n} in a row
          </div>
        )}
      </div>
    </section>
  )
}
