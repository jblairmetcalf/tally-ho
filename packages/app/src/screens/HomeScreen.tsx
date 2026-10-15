import { computeStats, goalLabel, isCompleted, winSeries } from '@tally/core'
import {
  Badge,
  Button,
  Card,
  ChampionCard,
  EmptyState,
  Icon,
  IconButton,
  Notice,
  ResumeCard,
  SectionTitle,
  Standings,
  StatTile,
  WinsChart,
  Wordmark,
} from '@tally/ui'
import { type CSSProperties, useMemo } from 'react'
import { useActions, useRoster, useTally } from '../context'
import { COPY } from '../copy'
import { GameRowFor } from './GameRowFor'

const rise = (i: number) => ({ '--i': i }) as CSSProperties

export function HomeScreen() {
  const games = useTally((s) => s.data.games)
  const active = useTally((s) => s.data.active)
  const hasSamples = useTally((s) => s.data.hasSamples)
  const muted = useTally((s) => s.data.prefs.muted)
  const a = useActions()
  const roster = useRoster()
  const { nameOf, colorOf } = roster

  const done = useMemo(() => games.filter(isCompleted), [games])
  const stats = useMemo(() => computeStats(done, nameOf), [done, nameOf])
  const series = useMemo(
    () => winSeries(done).map((s) => ({ ...s, name: nameOf(s.id), color: colorOf(s.id) })),
    [done, nameOf, colorOf],
  )

  const top = stats.standings[0]
  const leaders = top ? stats.standings.filter((x) => x.wins === top.wins) : []

  return (
    <main className="app">
      <header className="topbar">
        <Badge />
        <Wordmark />
        <span style={{ flex: 1 }} />
        <IconButton
          icon={muted ? 'mute' : 'volume'}
          label={muted ? COPY.soundOn : COPY.soundOff}
          on={!muted}
          onClick={a.toggleMute}
        />
        <IconButton
          icon="gear"
          label={COPY.settingsLabel}
          onClick={() => a.openSheet({ type: 'settings' })}
        />
      </header>

      {hasSamples && (
        <div className="rise">
          <Notice
            action={
              <Button variant="ghost" size="sm" onClick={a.clearSamples}>
                {COPY.home.clear}
              </Button>
            }
          >
            {COPY.home.samples}
          </Notice>
        </div>
      )}

      {active && (
        <div className="rise">
          <ResumeCard
            name={active.name}
            sub={COPY.home.resumeSub(active.rounds.length + 1, goalLabel(active))}
            onClick={a.resume}
          />
        </div>
      )}

      {done.length === 0 || !top ? (
        <Card className="rise">
          <EmptyState
            crown
            title={COPY.home.emptyTitle}
            body={COPY.home.emptyBody}
            action={
              <Button icon="plus" onClick={() => a.openSheet({ type: 'new' })}>
                {COPY.home.newGame}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="rise" style={rise(1)}>
            <ChampionCard
              leaders={leaders.map((x) => ({ name: nameOf(x.id), color: colorOf(x.id) }))}
              wins={top.wins}
              total={stats.total}
              streak={
                stats.current.n >= 2 && stats.current.id
                  ? { name: nameOf(stats.current.id), n: stats.current.n }
                  : null
              }
            />
          </div>

          <div className="rise" style={rise(2)}>
            <Standings
              rows={stats.standings.map((x) => ({
                id: x.id,
                name: nameOf(x.id),
                color: colorOf(x.id),
                wins: x.wins,
                played: x.played,
              }))}
            />
          </div>

          {stats.total >= 2 && (
            <Card as="section" className="rise" style={rise(3)}>
              <SectionTitle style={{ marginBottom: 10 }}>{COPY.home.overTime}</SectionTitle>
              <WinsChart series={series} />
            </Card>
          )}

          <section className="stats rise" style={rise(4)}>
            <StatTile icon="cards" tone="jade" value={stats.total} label={COPY.home.gamesPlayed} />
            <StatTile
              icon="flame"
              tone="coral"
              value={stats.best.n}
              label={COPY.home.longestStreak(stats.best.id ? nameOf(stats.best.id) : null)}
            />
            <StatTile
              icon="bolt"
              tone="amber"
              value={stats.big ? stats.big.v : COPY.home.dash}
              label={COPY.home.biggestRound(
                stats.big ? { name: nameOf(stats.big.id), game: stats.big.game } : null,
              )}
            />
            <StatTile
              icon="trophy"
              tone="lav"
              compact
              value={stats.fav ? stats.fav.name : COPY.home.dash}
              label={COPY.home.mostPlayed(stats.fav ? stats.fav.count : null)}
            />
          </section>

          <section
            className="rise"
            style={{ ...rise(5), display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle>{COPY.home.recent}</SectionTitle>
              <button type="button" className="link" onClick={() => a.go('history', 'tap')}>
                {COPY.home.seeAll} <Icon name="right" size={16} />
              </button>
            </div>
            {done.slice(0, 3).map((g) => (
              <GameRowFor key={g.id} game={g} roster={roster} />
            ))}
          </section>
        </>
      )}
    </main>
  )
}
