import { type Game, leadersOf, totalsOf } from '@tally/core'
import { Button, Chip, ConfirmButton, SheetTitle } from '@tally/ui'
import { useActions, useRoster } from '../context'
import { COPY } from '../copy'

export function EndGameSheet({ game: g }: { game: Game }) {
  const a = useActions()
  const roster = useRoster()
  const t = totalsOf(g)
  const l = leadersOf(g)
  const first = l[0]
  const tie = l.length > 1 || !g.rounds.length || !first
  return (
    <>
      <SheetTitle title={COPY.endGame.title(g.name)} onClose={() => a.closeSheet()} />
      {tie ? (
        <p className="hint" style={{ margin: 0, fontSize: 14.5, color: 'var(--muted)' }}>
          {g.rounds.length && first
            ? COPY.endGame.tied(l.map(roster.nameOf), t[first] ?? 0)
            : COPY.endGame.noRounds}
        </p>
      ) : (
        <div className="player-line" style={{ padding: 12 }}>
          <Chip name={roster.nameOf(first)} color={roster.colorOf(first)} size={44} crown />
          <span className="n">{COPY.endGame.leads(roster.nameOf(first), t[first] ?? 0)}</span>
        </div>
      )}
      {!tie && (
        <Button variant="amber" block icon="trophy" onClick={a.endGame}>
          {COPY.endGame.crown(roster.nameOf(first))}
        </Button>
      )}
      <Button variant="ghost" block onClick={() => a.closeSheet()}>
        {COPY.endGame.keepPlaying}
      </Button>
      <ConfirmButton
        label={COPY.endGame.discard}
        armedLabel={COPY.endGame.armed}
        icon="trash"
        onArm={() => a.play('error')}
        onConfirm={a.discardGame}
      />
    </>
  )
}
