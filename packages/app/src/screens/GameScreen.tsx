import { type Game, goalLabel, leaderOf, nearTarget, totalsOf } from '@tally/core'
import {
  Button,
  Card,
  IconButton,
  PlayerCard,
  RaceTrack,
  RoundLog,
  RoundPips,
  ScoreFields,
  SectionTitle,
} from '@tally/ui'
import { useEffect, useRef, useState } from 'react'
import { useActions, useRoster, useTally } from '../context'
import { COPY } from '../copy'

/** The live scoreboard (or a just-finished game behind the victory overlay). */
export function GameScreen({ game: g }: { game: Game }) {
  const flash = useTally((s) => s.flash)
  const muted = useTally((s) => s.data.prefs.muted)
  const a = useActions()
  const roster = useRoster()
  const t = totalsOf(g)
  const lead = leaderOf(g)
  const finished = !!g.winnerId
  const people = roster.people(g.playerIds)
  const [vals, setVals] = useState<string[]>(() => g.playerIds.map(() => ''))
  const btnRef = useRef<HTMLButtonElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the game changes (prototype)
  useEffect(() => {
    setVals(g.playerIds.map(() => ''))
  }, [g.id])

  const nextRound = g.rounds.length + 1
  const last = g.rounds[g.rounds.length - 1]
  const mine = flash && flash.gid === g.id ? flash : null
  const submit = () => {
    a.submitRound(vals, btnRef.current)
    setVals(g.playerIds.map(() => ''))
  }

  const sub = (id: string): string => {
    const total = t[id] ?? 0
    if (g.goal === 'score' && !finished && g.target != null) {
      if (total >= g.target) return COPY.game.overTheLine
      return g.lowWins ? COPY.game.untilBust(g.target - total) : COPY.game.toGo(g.target - total)
    }
    const lastV = last ? last.scores[id] : null
    return lastV != null ? COPY.game.lastRound(lastV) : COPY.game.noLast
  }

  return (
    <main className="app no-nav">
      <header className="game-top">
        <IconButton icon="back" label={COPY.back} onClick={a.backFromGame} />
        <div className="game-title">
          <h1 className="display" style={{ margin: 0 }}>
            {g.name}
          </h1>
          <div className="hint" style={{ color: 'var(--muted)' }}>
            {finished && g.winnerId
              ? COPY.game.subDone(roster.nameOf(g.winnerId), g.rounds.length)
              : COPY.game.subLive(nextRound, goalLabel(g))}
          </div>
        </div>
        <IconButton
          icon={muted ? 'mute' : 'volume'}
          label={muted ? COPY.soundOn : COPY.soundOff}
          on={!muted}
          onClick={a.toggleMute}
        />
        {!finished && (
          <IconButton
            icon="flag"
            label={COPY.endGameLabel}
            danger
            onClick={() => a.openSheet({ type: 'end' })}
          />
        )}
      </header>

      {g.goal === 'score' && g.target != null && (
        <RaceTrack
          players={people.map((p) => ({ ...p, total: t[p.id] ?? 0 }))}
          target={g.target}
          lowWins={g.lowWins}
        />
      )}
      {g.goal === 'rounds' && g.target != null && (
        <RoundPips target={g.target} done={g.rounds.length} />
      )}

      <div className="board" style={{ marginTop: 14 }}>
        {people.map((p) => {
          const total = t[p.id] ?? 0
          const near = !finished && nearTarget(g, total) ? (g.lowWins ? 'danger' : 'match') : null
          const d = mine ? mine.scores[p.id] : undefined
          return (
            <PlayerCard
              key={p.id}
              name={p.name}
              color={p.color}
              total={total}
              lead={lead === p.id}
              near={near}
              delta={d ?? null}
              bumpKey={mine && d != null ? mine.k : undefined}
              sub={sub(p.id)}
              crownKey={`c${p.id}`}
            />
          )
        })}
      </div>

      {!finished && (
        <Card as="section" className="entry">
          <div className="entry-head">
            <SectionTitle>{COPY.game.scoreRound(nextRound)}</SectionTitle>
            <span className="hint">{COPY.game.blankIsZero}</span>
          </div>
          <ScoreFields
            players={people}
            values={vals}
            onChange={setVals}
            onDone={submit}
            idPrefix="entry-"
            onSign={() => a.play('tap')}
          />
          <Button ref={btnRef} block icon="check" onClick={submit}>
            {COPY.game.scoreRound(nextRound)}
          </Button>
        </Card>
      )}

      {g.rounds.length > 0 && (
        <RoundLog
          players={people}
          rounds={g.rounds}
          lowWins={g.lowWins}
          editable={!finished}
          freshKey={mine && !mine.edit ? mine.k : null}
          onEdit={(idx) => a.openSheet({ type: 'round', idx })}
          nameOf={roster.nameOf}
        />
      )}
    </main>
  )
}
