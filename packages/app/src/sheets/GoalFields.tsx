import type { Goal } from '@tally/core'
import { cx, Segmented, Setting, Switch, TextInput } from '@tally/ui'
import { COPY } from '../copy'

const N = COPY.newGame

/** A target for each goal that has one, so switching goals never turns 200 points into 200 rounds. */
export type Targets = Record<Exclude<Goal, 'open'>, string>
const DEFAULT_TARGETS: Targets = { score: '200', rounds: '3', wins: '1' }

/** The defaults, with this game's own target filled in for its goal. */
export function targetsFor(goal: Goal, target: number | null): Targets {
  return goal === 'open' || !target
    ? { ...DEFAULT_TARGETS }
    : { ...DEFAULT_TARGETS, [goal]: String(target) }
}

/** Switching to `goal`: a blank or zero target falls back to its default (wins → 1), never empty. */
export function refill(targets: Targets, goal: Goal): Targets {
  if (goal === 'open' || Number.parseInt(targets[goal], 10) > 0) return targets
  return { ...targets, [goal]: DEFAULT_TARGETS[goal] }
}

export interface GoalFieldsProps {
  goal: Goal
  /** The typed target for the current goal (ignored when open). */
  target: string
  lowWins: boolean
  /** Rounds only: one round per player, so the count is `lineup` and can't be typed. */
  perPlayer: boolean
  /** How many are playing (or usually play): the round count when `perPlayer` is on. */
  lineup: number
  onGoal: (goal: Goal) => void
  onTarget: (raw: string) => void
  onLowWins: (on: boolean) => void
  onPerPlayer: (on: boolean) => void
  targetId?: string
}

/**
 * "How does it end?": the four goals and what each needs, shared by New game and the Settings
 * game editor. Three fixed rows whose layers share one cell each (`.stack`), sized by the
 * tallest, so switching goals never changes the sheet's height:
 * 1. the target field + its hint (score, rounds, wins) / the open-ended line;
 * 2. lowest-score-wins (score, rounds, open) / a line on how "Who won?" scores;
 * 3. one round per player (rounds only).
 */
export function GoalFields({
  goal,
  target,
  lowWins,
  perPlayer,
  lineup,
  onGoal,
  onTarget,
  onLowWins,
  onPerPlayer,
  targetId,
}: GoalFieldsProps) {
  const fixed = goal === 'rounds' && perPlayer
  const hints = [N.scoreHint, N.scoreHintLow, N.roundsHint, N.roundsHintLow, N.winsHint]
  const hint =
    goal === 'score'
      ? lowWins
        ? N.scoreHintLow
        : N.scoreHint
      : goal === 'wins'
        ? N.winsHint
        : lowWins
          ? N.roundsHintLow
          : N.roundsHint
  const label =
    goal === 'score'
      ? lowWins
        ? N.bustAt
        : N.pointsToWin
      : goal === 'wins'
        ? N.winsNeeded
        : N.numberOfRounds
  return (
    <>
      <Segmented<Goal>
        label={N.goalLabel}
        options={[
          { value: 'score', label: N.goals.score },
          { value: 'rounds', label: N.goals.rounds },
          { value: 'wins', label: N.goals.wins },
          { value: 'open', label: N.goals.open },
        ]}
        value={goal}
        onChange={onGoal}
      />
      <div className="stack">
        <div className={cx('row2', goal === 'open' && 'off')} style={{ alignItems: 'center' }}>
          <TextInput
            className="num"
            id={targetId}
            inputMode="numeric"
            value={fixed ? String(lineup) : target}
            readOnly={fixed}
            aria-label={label}
            onChange={(e) => onTarget(e.target.value.replace(/\D/g, '').slice(0, 5))}
          />
          <span className="stack center" style={{ flex: '1.3' }}>
            {hints.map((h) => (
              <span key={h} className={cx('hint', h !== hint && 'off')}>
                {h}
              </span>
            ))}
          </span>
        </div>
        <span className={cx('hint slot', goal !== 'open' && 'off')}>{N.openHint}</span>
      </div>
      <div className="stack">
        <div className={cx(goal === 'wins' && 'off')}>
          <Setting title={N.lowWins} hint={N.lowWinsHint}>
            <Switch checked={lowWins} label={N.lowWins} onChange={onLowWins} />
          </Setting>
        </div>
        <span className={cx('hint slot', goal !== 'wins' && 'off')}>{N.winsNote}</span>
      </div>
      <div className="stack">
        <div className={cx(goal !== 'rounds' && 'off')}>
          <Setting title={N.perPlayer} hint={N.perPlayerHint}>
            <Switch checked={perPlayer} label={N.perPlayer} onChange={onPerPlayer} />
          </Setting>
        </div>
      </div>
    </>
  )
}
