import { type Goal, isCompleted } from '@tally/core'
import {
  Button,
  cx,
  Eyebrow,
  Icon,
  Notice,
  Pill,
  PillRow,
  Segmented,
  Setting,
  SheetTitle,
  Switch,
  TextInput,
} from '@tally/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const active = useTally((s) => s.data.active)
  const roster = useRoster()
  const saved = roster.players.filter((p) => !p.archived)

  // How many finished games of each name are on the record.
  const played = useMemo(() => {
    const n = new Map<string, number>()
    for (const g of games) if (isCompleted(g)) n.set(g.name, (n.get(g.name) ?? 0) + 1)
    return n
  }, [games])

  // The household's presets, then any other game names from history (prototype), most played
  // first. The sort is stable, so ties keep that order.
  const options = useMemo<Option[]>(() => {
    const past = [...new Set(games.map((g) => g.name))].filter(
      (n) => !presets.some((p) => p.name === n),
    )
    const all = [
      ...presets,
      ...past.map((n) => {
        const g = games.find((x) => x.name === n)!
        return { name: n, goal: g.goal, target: g.target, lowWins: g.lowWins }
      }),
    ]
    return all.sort((x, y) => (played.get(y.name) ?? 0) - (played.get(x.name) ?? 0))
  }, [presets, games, played])

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
  const otherRef = useRef<HTMLInputElement>(null)
  // Other: straight to the name field, now that it's visible.
  useEffect(() => {
    if (sel === 'other') otherRef.current?.focus()
  }, [sel])

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

  // Every hint the target row can show, stacked so the row is as tall as the longest.
  const hints = [
    COPY.newGame.scoreHint,
    COPY.newGame.scoreHintLow,
    COPY.newGame.roundsHint,
    COPY.newGame.roundsHintLow,
  ]
  const hint =
    goal === 'score'
      ? lowWins
        ? COPY.newGame.scoreHintLow
        : COPY.newGame.scoreHint
      : lowWins
        ? COPY.newGame.roundsHintLow
        : COPY.newGame.roundsHint

  return (
    <>
      <SheetTitle title={COPY.newGame.title} onClose={() => a.closeSheet()} />
      {active && (
        <Notice
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                a.closeSheet(true)
                a.resume()
              }}
            >
              {COPY.newGame.resume}
            </Button>
          }
        >
          {COPY.newGame.inProgress(
            active.name,
            active.startedBy ? roster.nameOf(active.startedBy) : null,
          )}
        </Notice>
      )}
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
        {/* One input-high slot: the name field for Other, otherwise a line about the pick. */}
        <div className="stack">
          {/* Always laid out (hidden until Other), so it sizes the slot either way. */}
          <TextInput
            ref={otherRef}
            id="other-name"
            className={cx(sel !== 'other' && 'off')}
            placeholder={COPY.newGame.otherPlaceholder}
            aria-label={COPY.newGame.otherPlaceholder}
            value={other}
            maxLength={32}
            onChange={(e) => setOther(e.target.value)}
          />
          <span className={cx('hint slot', sel === 'other' && 'off')}>
            {sel && sel !== 'other'
              ? COPY.newGame.timesPlayed(played.get(sel) ?? 0)
              : COPY.newGame.pickHint}
          </span>
        </div>
      </div>

      {/* Always laid out at full height: skeletons until a game is picked, then the controls fade
          in over the same space, so the sheet never jumps. */}
      <div className="group">
        <Eyebrow>{COPY.newGame.howEnd}</Eyebrow>
        <div className="stack">
          {!sel && <GoalSkeleton />}
          <div className={cx('group', sel ? 'reveal' : 'off')} inert={!sel}>
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
            {/* The target row and the open-ended line share one cell, sized to the taller. */}
            <div className="stack">
              <div
                className={cx('row2', goal === 'open' && 'off')}
                style={{ alignItems: 'center' }}
              >
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
                <span className="stack center" style={{ flex: '1.3' }}>
                  {hints.map((h) => (
                    <span key={h} className={cx('hint', h !== hint && 'off')}>
                      {h}
                    </span>
                  ))}
                </span>
              </div>
              <span className={cx('hint slot', goal !== 'open' && 'off')}>
                {COPY.newGame.openHint}
              </span>
            </div>
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
        </div>
      </div>

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

      <div className="sheet-cta">
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
          <span className="label">{name ? COPY.newGame.dealIn(name) : COPY.newGame.start}</span>
        </Button>
      </div>
    </>
  )
}

/** Stand-ins for "How does it end?" before a game is picked: the segmented control, the target
 *  row and the low-wins switch, as quiet shimmering slabs. */
function GoalSkeleton() {
  return (
    <div className="skeleton-stack overlay" aria-hidden="true">
      <span className="skeleton" style={{ height: 51 }} />
      <div className="skeleton-row">
        <span className="skeleton" style={{ flex: 1, height: 52 }} />
        <span className="skeleton-lines">
          <span className="skeleton line" style={{ width: '92%' }} />
          <span className="skeleton line" style={{ width: '64%' }} />
        </span>
      </div>
      <div className="skeleton-row">
        <span className="skeleton-lines">
          <span className="skeleton line" style={{ width: '58%' }} />
          <span className="skeleton line" style={{ width: '40%' }} />
        </span>
        <span className="skeleton" style={{ width: 56, height: 34, borderRadius: 17 }} />
      </div>
    </div>
  )
}
