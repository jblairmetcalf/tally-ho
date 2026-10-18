import { type Goal, isCompleted, targetFor } from '@tally/core'
import { Button, cx, Eyebrow, Icon, Notice, Pill, PillRow, SheetTitle, TextInput } from '@tally/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useActions, useRoster, useTally } from '../context'
import { COPY } from '../copy'
import { GoalFields, refill, type Targets, targetsFor } from './GoalFields'

interface Option {
  name: string
  goal: Goal
  target: number | null
  lowWins: boolean
  roundsPerPlayer?: boolean
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
    // A game is picked by its name, so two with the same name (e.g. two presets left as
    // "New game") would be indistinguishable: keep the first of each.
    const seen = new Set<string>()
    const unique = all.filter((o) => {
      const k = o.name.trim().toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    return unique.sort((x, y) => (played.get(y.name) ?? 0) - (played.get(x.name) ?? 0))
  }, [presets, games, played])

  const [sel, setSel] = useState<string | null>(null)
  const [other, setOther] = useState('')
  const [goal, setGoal] = useState<Goal>('score')
  const [targets, setTargets] = useState<Targets>(() => targetsFor('score', null))
  const [lowWins, setLowWins] = useState(false)
  const [perPlayer, setPerPlayer] = useState(false)
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
      setTargets(targetsFor('open', null))
      setLowWins(false)
      setPerPlayer(false)
      return
    }
    setSel(o.name)
    setGoal(o.goal)
    setTargets(targetsFor(o.goal, o.target))
    setLowWins(o.lowWins)
    setPerPlayer(!!o.roundsPerPlayer)
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
    const tg = goal === 'open' ? null : Number.parseInt(targets[goal], 10)
    const counted = goal === 'rounds' && perPlayer
    if (goal !== 'open' && !counted && !(tg && tg > 0)) {
      a.play('error')
      setErr(
        goal === 'score'
          ? COPY.newGame.setTarget
          : goal === 'wins'
            ? COPY.newGame.setWins
            : COPY.newGame.setRounds,
      )
      return
    }
    a.startGame({
      name,
      goal,
      target: targetFor({ goal, target: tg, roundsPerPlayer: perPlayer }, players.length),
      lowWins: goal === 'wins' ? false : lowWins,
      playerIds: players,
    })
  }

  // Every saved player in a stable order, plus anyone else in the line-up (e.g. archived).
  const savedIds = new Set(saved.map((p) => p.id))
  const choices = [...saved, ...roster.people(players.filter((id) => !savedIds.has(id)))]

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
      {/* Who's at the table first, then what we're playing, then how it ends. */}
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
          <Button
            variant="ghost"
            icon="plus"
            iconSize={18}
            style={{ flex: 'none' }}
            onClick={add}
            disabled={!np.trim()}
          >
            {COPY.newGame.add}
          </Button>
        </div>
      </div>

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
            <GoalFields
              goal={goal}
              target={goal === 'open' ? '' : targets[goal]}
              lowWins={lowWins}
              perPlayer={perPlayer}
              lineup={players.length}
              targetId="goal-target"
              onGoal={(k) => {
                a.play('tap')
                setGoal(k)
                setTargets((t) => refill(t, k))
              }}
              onTarget={(v) => {
                if (goal !== 'open') setTargets((t) => ({ ...t, [goal]: v }))
              }}
              onLowWins={(v) => {
                a.play('tap')
                setLowWins(v)
              }}
              onPerPlayer={(v) => {
                a.play('tap')
                setPerPlayer(v)
                // Off again: start from the line-up's count rather than a stale number.
                if (!v) setTargets((t) => ({ ...t, rounds: String(Math.max(1, players.length)) }))
              }}
            />
          </div>
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
 *  row and the two switch rows, as quiet shimmering slabs. */
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
      <div className="skeleton-row">
        <span className="skeleton-lines">
          <span className="skeleton line" style={{ width: '52%' }} />
          <span className="skeleton line" style={{ width: '70%' }} />
        </span>
        <span className="skeleton" style={{ width: 56, height: 34, borderRadius: 17 }} />
      </div>
    </div>
  )
}
