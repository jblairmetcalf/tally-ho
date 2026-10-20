import { type Game, leadersOf, totalsOf } from '@tally/core'
import { Button, Chip, ConfirmButton } from '@tally/ui'
import { useActions, useRoster } from '../context'
import { COPY } from '../copy'

/** End the game: a page pushed inside the game sheet. Keep playing goes back to the scoreboard. */
export function EndGameSheet({ game: g }: { game: Game }) {
  const a = useActions()
  const roster = useRoster()
  const t = totalsOf(g)
  const l = leadersOf(g)
  const first = l[0]
  const tie = l.length > 1 || !g.rounds.length || !first
  return (
    <>
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
      {/* Level at the top: crown one of them by the game's own tiebreak rule. */}
      {tie && g.rounds.length > 0 && l.length > 1 && (
        <div className="crowns">
          {l.map((id) => (
            <Button key={id} variant="amber" icon="trophy" onClick={() => a.crownWinner(id)}>
              {COPY.game.crown(roster.nameOf(id))}
            </Button>
          ))}
        </div>
      )}
      <Button variant="ghost" block onClick={a.gameBack}>
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
