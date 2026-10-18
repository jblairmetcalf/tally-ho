import { isCompleted } from '@tally/core'
import { Button, EmptyState, Eyebrow, Pill, PillRow } from '@tally/ui'
import { type CSSProperties, useMemo, useState } from 'react'
import { useActions, useRoster, useTally } from '../context'
import { COPY } from '../copy'
import { GameRowFor } from './GameRowFor'

export function HistoryScreen() {
  const all = useTally((s) => s.data.games)
  const play = useTally((s) => s.actions.play)
  const roster = useRoster()
  const a = useActions()
  const [fg, setFg] = useState<string>('all')
  const [fw, setFw] = useState<string>('all')

  const games = useMemo(() => all.filter(isCompleted), [all])
  const names = useMemo(() => [...new Set(games.map((g) => g.name))], [games])
  const players = useMemo(() => [...new Set(games.flatMap((g) => g.playerIds))], [games])
  const list = games.filter(
    (g) => (fg === 'all' || g.name === fg) && (fw === 'all' || g.winnerId === fw),
  )
  const pick = (fn: (v: string) => void, v: string) => {
    play('pick')
    fn(v)
  }

  return (
    <main className="app">
      <header className="topbar">
        <div style={{ flex: 1 }}>
          <Eyebrow>{COPY.history.eyebrow}</Eyebrow>
          <h1
            className="display"
            style={{ fontSize: 34, margin: '2px 0 0', color: 'var(--amber-text)' }}
          >
            {COPY.history.title}
          </h1>
        </div>
      </header>

      {games.length > 0 && (
        <div className="group">
          <Eyebrow>{COPY.history.game}</Eyebrow>
          <PillRow scroll label={COPY.history.game}>
            <Pill on={fg === 'all'} onClick={() => pick(setFg, 'all')}>
              {COPY.history.allGames}
            </Pill>
            {names.map((n) => (
              <Pill key={n} on={fg === n} onClick={() => pick(setFg, n)}>
                {n}
              </Pill>
            ))}
          </PillRow>
          <Eyebrow style={{ marginTop: 4 }}>{COPY.history.winner}</Eyebrow>
          <PillRow scroll label={COPY.history.winner}>
            <Pill on={fw === 'all'} onClick={() => pick(setFw, 'all')}>
              {COPY.history.anyone}
            </Pill>
            {players.map((p) => (
              <Pill
                key={p}
                on={fw === p}
                onClick={() => pick(setFw, p)}
                chip={{ name: roster.nameOf(p), color: roster.colorOf(p) }}
              >
                {roster.nameOf(p)}
              </Pill>
            ))}
          </PillRow>
        </div>
      )}

      <div className="hint" style={{ fontSize: 13.5, color: 'var(--muted)' }} aria-live="polite">
        {COPY.history.count(
          list.length,
          fw !== 'all' ? roster.nameOf(fw) : null,
          fg !== 'all' ? fg : null,
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={games.length ? COPY.history.noMatchTitle : COPY.history.emptyTitle}
          body={games.length ? COPY.history.noMatchBody : COPY.history.emptyBody}
          action={
            // Nothing played yet: deal the first one from here. (With games but no match,
            // the hint to change the filters is the answer, not a new game.)
            games.length ? undefined : (
              <Button icon="plus" onClick={() => a.openSheet({ type: 'new' })}>
                {COPY.home.newGame}
              </Button>
            )
          }
        />
      ) : (
        list.map((g, i) => (
          <div className="rise" style={{ '--i': Math.min(i, 8) } as CSSProperties} key={g.id}>
            <GameRowFor game={g} roster={roster} />
          </div>
        ))
      )}
    </main>
  )
}
