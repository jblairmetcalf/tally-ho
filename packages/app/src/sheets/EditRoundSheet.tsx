import type { Game } from '@tally/core'
import { Button, ConfirmButton, ScoreFields, SheetTitle } from '@tally/ui'
import { useState } from 'react'
import { useActions, useRoster } from '../context'
import { COPY } from '../copy'

export function EditRoundSheet({ game: g, idx }: { game: Game; idx: number }) {
  const a = useActions()
  const roster = useRoster()
  const r = g.rounds[idx]
  const [vals, setVals] = useState<string[]>(() =>
    g.playerIds.map((p) => {
      const v = r?.scores[p]
      return v == null ? '' : String(v)
    }),
  )
  if (!r) return null
  const n = idx + 1
  return (
    <>
      <SheetTitle title={COPY.editRound.title(n)} onClose={() => a.closeSheet()} />
      <ScoreFields
        players={roster.people(g.playerIds)}
        values={vals}
        onChange={setVals}
        onDone={() => a.saveRound(idx, vals)}
        idPrefix="edit-"
        onSign={() => a.play('tap')}
      />
      <span className="hint">{COPY.editRound.hint}</span>
      <Button block icon="check" onClick={() => a.saveRound(idx, vals)}>
        {COPY.editRound.save(n)}
      </Button>
      <ConfirmButton
        label={COPY.editRound.del(n)}
        armedLabel={COPY.editRound.armed}
        icon="trash"
        onArm={() => a.play('error')}
        onConfirm={() => a.deleteRound(idx)}
      />
    </>
  )
}
