import { computeStats, goalLabel, isCompleted, winSeries } from '@tally/core'
import {
  Badge,
  Button,
  Card,
  ChampionCard,
  EmptyState,
  IconButton,
  Notice,
  ResumeCard,
  SectionTitle,
  Standings,
  StatList,
  SyncBadge,
  WinsChart,
  Wordmark,
} from '@tally/ui'
import { type CSSProperties, useEffect, useMemo } from 'react'
import { useActions, useRoster, useTally } from '../context'
import { COPY } from '../copy'
import { takeWelcome } from '../sheets/SignInSheet'
import { useSession } from '../sync/session'
import { GameRowFor } from './GameRowFor'

const rise = (i: number) => ({ '--i': i }) as CSSProperties

export function HomeScreen() {
  const games = useTally((s) => s.data.games)
  const active = useTally((s) => s.data.active)
  const hasSamples = useTally((s) => s.data.hasSamples)
  const muted = useTally((s) => s.data.prefs.muted)
  const a = useActions()
  const { enabled, session, sync } = useSession()
  const roster = useRoster()
  const { nameOf, colorOf } = roster

  // Just signed in: the app re-keyed onto the family's store, so the welcome is said here.
  useEffect(() => {
    const name = takeWelcome(session)
    if (name) {
      a.play('start')
      a.showToast(COPY.signIn.welcome(name))
    }
  }, [session, a])

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
        {/* The bar is full at phone width, so sync status pins to the fox badge. */}
        <div className="badge-slot">
          <Badge />
          {enabled &&
            (session.mode === 'family' ? (
              <SyncBadge
                compact
                state={sync?.state ?? 'synced'}
                onClick={(label) => {
                  a.play('tap')
                  a.showToast(label)
                }}
              />
            ) : (
              <button
                type="button"
                className="demo-chip"
                onClick={() => a.openSheet({ type: 'settings' })}
              >
                {COPY.family.demoChip}
              </button>
            ))}
        </div>
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
        <EmptyState
          className="rise"
          crown
          title={COPY.home.emptyTitle}
          body={COPY.home.emptyBody}
          action={
            <Button icon="plus" onClick={() => a.openSheet({ type: 'new' })}>
              {COPY.home.newGame}
            </Button>
          }
        />
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

          <StatList
            className="rise"
            style={rise(4)}
            title={COPY.home.statsTitle}
            rows={[
              { label: COPY.home.gamesPlayed, value: stats.total },
              {
                label: COPY.home.longestStreak,
                value: stats.best.n,
                detail: stats.best.id ? nameOf(stats.best.id) : undefined,
              },
              {
                label: COPY.home.biggestRound,
                value: stats.big ? stats.big.v : COPY.home.dash,
                detail: stats.big
                  ? COPY.home.bigDetail(nameOf(stats.big.id), stats.big.game)
                  : undefined,
              },
              {
                label: COPY.home.mostPlayed,
                value: stats.fav ? stats.fav.count : COPY.home.dash,
                detail: stats.fav?.name,
              },
            ]}
          />

          <section
            className="rise"
            style={{ ...rise(5), display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <SectionTitle>{COPY.home.recent}</SectionTitle>
            {done.slice(0, 3).map((g) => (
              <GameRowFor key={g.id} game={g} roster={roster} />
            ))}
          </section>
        </>
      )}
    </main>
  )
}
