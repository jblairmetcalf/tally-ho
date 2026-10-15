import type { Goal } from '@tally/core'
import {
  Button,
  Eyebrow,
  Icon,
  Pill,
  PillRow,
  Segmented,
  Setting,
  SheetTitle,
  Switch,
  TextInput,
} from '@tally/ui'
import { useMemo, useState } from 'react'
import { useActions, useRoster, useTally } from '../context'
import { COPY } from '../copy'

interface Option {
  name: string
  goal: Goal
  target: number | null
  lowWins: boolean
}

export function NewGameSheet() {
  const a = useActions()
  const presets = useTally((s) => s.data.presets)
  const games = useTally((s) => s.data.games)
  const lastPlayerIds = useTally((s) => s.data.lastPlayerIds)
  const roster = useRoster()
  const saved = roster.players.filter((p) => !p.archived)

  // The household's presets, then any other game names from history (prototype).
  const options = useMemo<Option[]>(() => {
    const past = [...new Set(games.map((g) => g.name))].filter(
      (n) => !presets.some((p) => p.name === n),
    )
    return [
      ...presets,
      ...past.map((n) => {
        const g = games.find((x) => x.name === n)!
        return { name: n, goal: g.goal, target: g.target, lowWins: g.lowWins }
      }),
    ]
  }, [presets, games])

  const [sel, setSel] = useState<string | null>(null)
  const [other, setOther] = useState('')
  const [goal, setGoal] = useState<Goal>('score')
  const [target, setTarget] = useState('200')
  const [lowWins, setLowWins] = useState(false)
  const [players, setPlayers] = useState<string[]>(() => {
    const live = new Set(saved.map((p) => p.id))
    const last = lastPlayerIds.filter((id) => live.has(id))
    return last.length ? last : saved.slice(0, 3).map((p) => p.id)
  })
  const [np, setNp] = useState('')
  const [err, setErr] = useState('')

  const choose = (o: Option | 'other') => {
    a.play('pick')
    setErr('')
    if (o === 'other') {
      setSel('other')
      setGoal('open')
      setTarget('')
      setLowWins(false)
      return
    }
    setSel(o.name)
    setGoal(o.goal)
    setTarget(o.target ? String(o.target) : '')
    setLowWins(o.lowWins)
  }

  const toggle = (id: string) => {
    setErr('')
    if (players.includes(id)) {
      a.play('remove')
      setPlayers(players.filter((p) => p !== id))
    } else {
      a.play('add')
      setPlayers([...players, id])
    }
  }

  const add = () => {
    const n = np.trim()
    if (!n) return
    const playing = players.some((id) => roster.nameOf(id).toLowerCase() === n.toLowerCase())
    if (playing) {
      a.play('error')
      setErr(COPY.newGame.alreadyPlaying(n))
      return
    }
    const id = a.upsertPlayer(n)
    setPlayers([...players, id])
    setNp('')
    setErr('')
    a.play('add')
  }

  const name = sel === 'other' ? other.trim() : sel
  const start = () => {
    if (!name) {
      a.play('error')
      setErr(sel === 'other' ? COPY.newGame.nameGame : COPY.newGame.pickGame)
      return
    }
    if (players.length < 2) {
      a.play('error')
      setErr(COPY.newGame.twoPlayers)
      return
    }
    const tg = Number.parseInt(target, 10)
    if (goal !== 'open' && !(tg > 0)) {
      a.play('error')
      setErr(goal === 'score' ? COPY.newGame.setTarget : COPY.newGame.setRounds)
      return
    }
    a.startGame({ name, goal, target: goal === 'open' ? null : tg, lowWins, playerIds: players })
  }

  // Every saved player in a stable order, plus anyone else in the line-up (e.g. archived).
  const savedIds = new Set(saved.map((p) => p.id))
  const choices = [...saved, ...roster.people(players.filter((id) => !savedIds.has(id)))]

  const scoreHint = lowWins ? COPY.newGame.scoreHintLow : COPY.newGame.scoreHint
  const roundsHint = lowWins ? COPY.newGame.roundsHintLow : COPY.newGame.roundsHint

  return (
    <>
      <SheetTitle title={COPY.newGame.title} onClose={() => a.closeSheet()} />
      <div className="group">
        <Eyebrow>{COPY.newGame.what}</Eyebrow>
        <PillRow label={COPY.newGame.what}>
          {options.map((o) => (
            <Pill key={o.name} on={sel === o.name} onClick={() => choose(o)}>
              {o.name}
              {o.lowWins && <span className="low-tag">{COPY.newGame.lowTag}</span>}
            </Pill>
          ))}
          <Pill on={sel === 'other'} onClick={() => choose('other')}>
            <Icon name="plus" size={16} />
            {COPY.newGame.other}
          </Pill>
        </PillRow>
        {sel === 'other' && (
          <TextInput
            id="other-name"
            placeholder={COPY.newGame.otherPlaceholder}
            aria-label={COPY.newGame.otherPlaceholder}
            value={other}
            maxLength={32}
            onChange={(e) => setOther(e.target.value)}
            autoFocus
          />
        )}
      </div>

      {sel && (
        <div className="group rise">
          <Eyebrow>{COPY.newGame.howEnd}</Eyebrow>
          <Segmented<Goal>
            label={COPY.newGame.goalLabel}
            options={[
              { value: 'score', label: COPY.newGame.goals.score },
              { value: 'rounds', label: COPY.newGame.goals.rounds },
              { value: 'open', label: COPY.newGame.goals.open },
            ]}
            value={goal}
            onChange={(k) => {
              a.play('tap')
              setGoal(k)
              if (k === 'score' && !target) setTarget('200')
              if (k === 'rounds' && !target) setTarget('3')
            }}
          />
          {goal !== 'open' && (
            <div className="row2" style={{ alignItems: 'center' }}>
              <TextInput
                className="num"
                id="goal-target"
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/\D/g, '').slice(0, 5))}
                aria-label={
                  goal === 'score'
                    ? lowWins
                      ? COPY.newGame.bustAt
                      : COPY.newGame.pointsToWin
                    : COPY.newGame.numberOfRounds
                }
              />
              <span className="hint" style={{ flex: '1.3' }}>
                {goal === 'score' ? scoreHint : roundsHint}
              </span>
            </div>
          )}
          {goal === 'open' && <span className="hint">{COPY.newGame.openHint}</span>}
          <Setting title={COPY.newGame.lowWins} hint={COPY.newGame.lowWinsHint}>
            <Switch
              checked={lowWins}
              label={COPY.newGame.lowWins}
              onChange={(v) => {
                a.play('tap')
                setLowWins(v)
              }}
            />
          </Setting>
        </div>
      )}

      <div className="group">
        <Eyebrow>{COPY.newGame.players}</Eyebrow>
        <PillRow label={COPY.newGame.whoIsPlaying}>
          {choices.map((p) => (
            <Pill
              key={p.id}
              on={players.includes(p.id)}
              onClick={() => toggle(p.id)}
              chip={{ name: p.name, color: p.color }}
            >
              {p.name}
            </Pill>
          ))}
        </PillRow>
        <div className="row2">
          <TextInput
            id="new-player"
            placeholder={COPY.newGame.addPlaceholder}
            aria-label={COPY.newGame.addPlaceholder}
            value={np}
            onChange={(e) => setNp(e.target.value.slice(0, 16))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            enterKeyHint="done"
          />
          <Button variant="ghost" icon="plus" iconSize={18} style={{ flex: 'none' }} onClick={add}>
            {COPY.newGame.add}
          </Button>
        </div>
      </div>

      {err && (
        <div
          className="hint shake"
          key={err}
          role="alert"
          style={{ color: 'var(--coral-text)', fontSize: 14 }}
        >
          {err}
        </div>
      )}
      <Button variant="amber" block onClick={start}>
        {name ? COPY.newGame.dealIn(name) : COPY.newGame.start}
      </Button>
    </>
  )
}
