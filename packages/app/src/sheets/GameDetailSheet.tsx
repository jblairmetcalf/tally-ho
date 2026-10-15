import { type CompletedGame, goalLabel, ranked, totalsOf } from '@tally/core'
import { Button, ConfirmButton, Podium, RoundLog, SheetTitle } from '@tally/ui'
import { useActions, useRoster } from '../context'
import { COPY, longDate } from '../copy'

export function GameDetailSheet({ game: g }: { game: CompletedGame }) {
  const a = useActions()
  const roster = useRoster()
  const t = totalsOf(g)
  return (
    <>
      <SheetTitle title={g.name} onClose={() => a.closeSheet()} />
      <div className="hint" style={{ marginTop: -10, color: 'var(--muted)' }}>
        {COPY.detail.sub(longDate(g.completedAt), g.rounds.length, goalLabel(g), !!g.sample)}
      </div>
      <div className="group">
        <Podium
          rows={ranked(g).map((id) => ({
            id,
            name: roster.nameOf(id),
            color: roster.colorOf(id),
            total: t[id] ?? 0,
          }))}
          delayMs={0}
        />
      </div>
      <RoundLog
        players={roster.people(g.playerIds)}
        rounds={g.rounds}
        lowWins={g.lowWins}
        editable={false}
        style={{ padding: 6 }}
      />
      <Button block icon="repeat" onClick={() => a.rematch(g)}>
        {COPY.detail.rematch}
      </Button>
      <ConfirmButton
        label={COPY.detail.del}
        armedLabel={COPY.detail.armed}
        icon="trash"
        onArm={() => a.play('error')}
        onConfirm={() => a.deleteGame(g.id)}
      />
    </>
  )
}
