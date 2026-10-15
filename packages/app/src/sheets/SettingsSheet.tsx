import { type Goal, goalLabel, type Player, type Preset, type ThemePref } from '@tally/core'
import {
  Button,
  Chip,
  ConfirmButton,
  Eyebrow,
  Icon,
  IconButton,
  Pill,
  PillRow,
  SectionTitle,
  Segmented,
  Setting,
  SFX,
  SheetTitle,
  Swatches,
  Switch,
  TextInput,
} from '@tally/ui'
import { useState } from 'react'
import { useActions, useTally } from '../context'
import { COPY } from '../copy'
import { uniqueId } from '../store'

const C = COPY.settings

function PlayerEditor({ player, others }: { player: Player; others: Player[] }) {
  const a = useActions()
  const [name, setName] = useState(player.name)
  const [err, setErr] = useState('')
  const commit = () => {
    if (name.trim() === player.name) return
    if (a.renamePlayer(player.id, name)) {
      setErr('')
      a.play('pick')
    } else {
      a.play('error')
      setErr(name.trim() ? C.alreadyHere(name.trim()) : '')
      setName(player.name)
    }
  }
  return (
    <div className="group" style={{ padding: '4px 0 12px' }}>
      <TextInput
        aria-label={C.nameOf(player.name)}
        value={name}
        maxLength={16}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        enterKeyHint="done"
      />
      {err && (
        <div className="hint shake" role="alert" style={{ color: 'var(--coral-text)' }}>
          {err}
        </div>
      )}
      <Swatches
        label={C.colourOf(player.name)}
        value={player.color}
        taken={others.map((p) => p.color)}
        onChange={(i) => {
          a.play('pick')
          a.setPlayerColor(player.id, i)
        }}
      />
      <span className="hint">{C.archiveHint}</span>
      <ConfirmButton
        label={C.archive}
        armedLabel={C.archiveArmed}
        icon="trash"
        onArm={() => a.play('error')}
        onConfirm={() => {
          a.play('del')
          a.archivePlayer(player.id)
          a.showToast(COPY.toast.playerArchived(player.name))
        }}
      />
    </div>
  )
}

function PlayersSection() {
  const a = useActions()
  const players = useTally((s) => s.data.players)
  const live = players.filter((p) => !p.archived)
  const archived = players.filter((p) => p.archived)
  const [open, setOpen] = useState<string | null>(null)
  const [np, setNp] = useState('')
  const [err, setErr] = useState('')

  const add = () => {
    const n = np.trim()
    if (!n) return
    if (live.some((p) => p.name.toLowerCase() === n.toLowerCase())) {
      a.play('error')
      setErr(C.alreadyHere(n))
      return
    }
    a.upsertPlayer(n)
    a.play('add')
    setNp('')
    setErr('')
  }

  return (
    <section className="group" aria-labelledby="set-players">
      <SectionTitle>
        <span id="set-players">{C.players}</span>
      </SectionTitle>
      {live.map((p) => {
        const isOpen = open === p.id
        return (
          <div key={p.id}>
            <div className="player-line">
              <Chip name={p.name} color={p.color} size={34} />
              <span className="n">{p.name}</span>
              <IconButton
                icon={isOpen ? 'x' : 'pencil'}
                label={C.editPlayer(p.name)}
                aria-expanded={isOpen}
                onClick={() => {
                  a.play('tap')
                  setOpen(isOpen ? null : p.id)
                }}
              />
            </div>
            {isOpen && (
              <PlayerEditor key={p.id} player={p} others={live.filter((q) => q.id !== p.id)} />
            )}
          </div>
        )
      })}
      <div className="row2">
        <TextInput
          placeholder={C.addPlayer}
          aria-label={C.addPlayer}
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
          {C.add}
        </Button>
      </div>
      {err && (
        <div className="hint shake" key={err} role="alert" style={{ color: 'var(--coral-text)' }}>
          {err}
        </div>
      )}
      {archived.length > 0 && (
        <>
          <Eyebrow>{C.archived}</Eyebrow>
          <PillRow label={C.archived}>
            {archived.map((p) => (
              <Pill
                key={p.id}
                onClick={() => {
                  a.play('add')
                  a.upsertPlayer(p.name)
                }}
                chip={{ name: p.name, color: p.color }}
              >
                <span className="sr-only">{C.restore(p.name)}</span>
                <span aria-hidden="true">{p.name}</span>
                <Icon name="repeat" size={14} />
              </Pill>
            ))}
          </PillRow>
        </>
      )}
    </section>
  )
}

function PresetEditor({ preset }: { preset: Preset }) {
  const a = useActions()
  const [name, setName] = useState(preset.name)
  const [target, setTarget] = useState(preset.target ? String(preset.target) : '')
  const save = (patch: Partial<Preset>) => a.upsertPreset({ ...preset, ...patch })
  const commitTarget = (raw: string) => {
    const n = Number.parseInt(raw, 10)
    if (n > 0) save({ target: n })
  }
  return (
    <div className="group" style={{ padding: '4px 0 12px' }}>
      <TextInput
        aria-label={C.gameName}
        value={name}
        maxLength={32}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim()) save({ name: name.trim() })
          else setName(preset.name)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
      />
      <Segmented<Goal>
        label={COPY.newGame.goalLabel}
        options={[
          { value: 'score', label: COPY.newGame.goals.score },
          { value: 'rounds', label: COPY.newGame.goals.rounds },
          { value: 'open', label: COPY.newGame.goals.open },
        ]}
        value={preset.goal}
        onChange={(goal) => {
          a.play('tap')
          const fallback = goal === 'score' ? 200 : goal === 'rounds' ? 3 : null
          const tg =
            goal === 'open'
              ? null
              : Number.parseInt(target, 10) > 0
                ? Number.parseInt(target, 10)
                : fallback
          if (tg) setTarget(String(tg))
          save({ goal, target: tg })
        }}
      />
      {preset.goal !== 'open' && (
        <div className="row2" style={{ alignItems: 'center' }}>
          <TextInput
            className="num"
            inputMode="numeric"
            value={target}
            aria-label={
              preset.goal === 'score'
                ? preset.lowWins
                  ? COPY.newGame.bustAt
                  : COPY.newGame.pointsToWin
                : COPY.newGame.numberOfRounds
            }
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 5)
              setTarget(v)
              commitTarget(v)
            }}
          />
          <span className="hint" style={{ flex: '1.3' }}>
            {goalLabel(preset)}
          </span>
        </div>
      )}
      <Setting title={COPY.newGame.lowWins} hint={COPY.newGame.lowWinsHint}>
        <Switch
          checked={preset.lowWins}
          label={COPY.newGame.lowWins}
          onChange={(v) => {
            a.play('tap')
            save({ lowWins: v })
          }}
        />
      </Setting>
      <ConfirmButton
        label={C.deleteGame}
        armedLabel={C.deleteGameArmed}
        icon="trash"
        onArm={() => a.play('error')}
        onConfirm={() => {
          a.play('del')
          a.deletePreset(preset.id)
          a.showToast(COPY.toast.gameRemoved(preset.name))
        }}
      />
    </div>
  )
}

function GamesSection() {
  const a = useActions()
  const presets = useTally((s) => s.data.presets)
  const [open, setOpen] = useState<string | null>(null)
  const addGame = () => {
    const id = uniqueId(
      C.newGameName,
      presets.map((p) => p.id),
    )
    a.play('add')
    a.upsertPreset({ id, name: C.newGameName, goal: 'score', target: 100, lowWins: false })
    setOpen(id)
  }
  return (
    <section className="group" aria-labelledby="set-games">
      <SectionTitle>
        <span id="set-games">{C.games}</span>
      </SectionTitle>
      {presets.map((p) => {
        const isOpen = open === p.id
        return (
          <div key={p.id}>
            <div className="player-line">
              <span className="n" style={{ display: 'flex', flexDirection: 'column' }}>
                {p.name}
                <span className="hint" style={{ fontWeight: 700, color: 'var(--muted)' }}>
                  {goalLabel(p)}
                </span>
              </span>
              <IconButton
                icon={isOpen ? 'x' : 'pencil'}
                label={C.editGame(p.name)}
                aria-expanded={isOpen}
                onClick={() => {
                  a.play('tap')
                  setOpen(isOpen ? null : p.id)
                }}
              />
            </div>
            {isOpen && <PresetEditor key={p.id} preset={p} />}
          </div>
        )
      })}
      <Button variant="ghost" block icon="plus" iconSize={18} onClick={addGame}>
        {C.addGame}
      </Button>
    </section>
  )
}

export function SettingsSheet() {
  const a = useActions()
  const prefs = useTally((s) => s.data.prefs)
  const hasSamples = useTally((s) => s.data.hasSamples)
  return (
    <>
      <SheetTitle title={C.title} onClose={() => a.closeSheet()} />
      <PlayersSection />
      <GamesSection />

      <section className="group" aria-labelledby="set-look">
        <SectionTitle>
          <span id="set-look">{C.appearance}</span>
        </SectionTitle>
        <Segmented<ThemePref>
          label={C.theme}
          options={[
            { value: 'system', label: C.themes.system },
            { value: 'dark', label: C.themes.dark },
            { value: 'light', label: C.themes.light },
          ]}
          value={prefs.theme}
          onChange={(v) => {
            a.play('tap')
            a.setPref('theme', v)
          }}
        />
        <div>
          <Setting title={C.sound} hint={C.soundHint}>
            <Switch checked={!prefs.muted} label={C.sound} onChange={() => a.toggleMute()} />
          </Setting>
          {SFX.canPlayInSilent() && (
            <Setting title={C.soundInSilent} hint={C.soundInSilentHint}>
              <Switch
                checked={prefs.soundInSilent}
                label={C.soundInSilent}
                onChange={(v) => {
                  a.setPref('soundInSilent', v)
                  SFX.setPlayInSilent(v)
                  a.play('tap')
                }}
              />
            </Setting>
          )}
          <Setting title={C.haptics} hint={C.hapticsHint}>
            <Switch
              checked={prefs.haptics}
              label={C.haptics}
              onChange={(v) => {
                a.setPref('haptics', v)
                a.play('tap')
              }}
            />
          </Setting>
          <Setting title={C.wakeLock} hint={C.wakeLockHint}>
            <Switch
              checked={prefs.wakeLock}
              label={C.wakeLock}
              onChange={(v) => {
                a.play('tap')
                a.setPref('wakeLock', v)
              }}
            />
          </Setting>
          {hasSamples && (
            <Setting title={C.samples} hint={C.samplesHint}>
              <Button variant="ghost" size="sm" onClick={a.clearSamples}>
                {C.clearSamples}
              </Button>
            </Setting>
          )}
        </div>
      </section>

      <Button variant="ghost" block onClick={() => a.closeSheet()}>
        {C.done}
      </Button>
    </>
  )
}
