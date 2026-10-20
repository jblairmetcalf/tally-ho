import type { Game } from '@tally/core'
import { Button, ConfirmButton, ScoreFields, WinnerPicker } from '@tally/ui'
import { useState } from 'react'
import { useActions, useRoster } from '../context'
import { COPY } from '../copy'

/** Edit round N: a page pushed inside the game sheet (its header names it). */
export function EditRoundSheet({ game: g, idx }: { game: Game; idx: number }) {
  const a = useActions()
  const roster = useRoster()
  const r = g.rounds[idx]
  const wins = g.goal === 'wins'
  const [vals, setVals] = useState<string[]>(() =>
    g.playerIds.map((p) => {
      const v = r?.scores[p]
      return v == null ? '' : String(v)
    }),
  )
  // "Who won?": the round is one winner; saving writes 1 for them and 0 for everyone else.
  const [winner, setWinner] = useState<string | null>(
    () => g.playerIds.find((p) => (r?.scores[p] ?? 0) > 0) ?? null,
  )
  if (!r) return null
  const n = idx + 1
  const save = () =>
    a.saveRound(idx, wins ? g.playerIds.map((p) => (p === winner ? '1' : '0')) : vals)
  return (
    <>
      {wins ? (
        <WinnerPicker
          players={roster.people(g.playerIds)}
          label={COPY.editRound.whoWon}
          selected={winner}
          onPick={(id) => {
            a.play('pick')
            setWinner(id)
          }}
        />
      ) : (
        <ScoreFields
          players={roster.people(g.playerIds)}
          values={vals}
          onChange={setVals}
          onDone={save}
          idPrefix="edit-"
          onSign={() => a.play('tap')}
        />
      )}
      <span className="hint">{wins ? COPY.editRound.winsHint : COPY.editRound.hint}</span>
      <Button block icon="check" onClick={save}>
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
