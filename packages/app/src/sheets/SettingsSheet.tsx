import { type Goal, goalLabel, type Player, type Preset, type ThemePref } from '@tally/core'
import {
  Button,
  Chip,
  ConfirmButton,
  cx,
  Eyebrow,
  Icon,
  IconButton,
  Pill,
  PillRow,
  SectionTitle,
  Segmented,
  Setting,
  Sheet,
  SheetTitle,
  Swatches,
  Switch,
  SyncBadge,
  TextInput,
} from '@tally/ui'
import { useRef, useState } from 'react'
import { useActions, useRoster, useTally, useTallyStore } from '../context'
import { COPY } from '../copy'
import { uniqueId } from '../store'
import { useSession } from '../sync/session'

const C = COPY.settings

/**
 * Which item's editor sheet is up. The last item stays rendered while the sheet slides away,
 * even if it was just archived or deleted.
 */
function useEditor<T extends { id: string }>(items: T[]) {
  const a = useActions()
  const [id, setId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const last = useRef<T | null>(null)
  const live = items.find((x) => x.id === id) ?? null
  if (live) last.current = live
  return {
    item: live ?? last.current,
    open: open && !!live,
    show: (next: string, cue: 'open' | 'add' = 'open') => {
      a.play(cue)
      setId(next)
      setOpen(true)
    },
    /** Escape, backdrop, drag or the close button. */
    close: () => {
      a.play('close')
      setOpen(false)
    },
    /** Gone without the close sound (archived, deleted: they play their own). */
    dismiss: () => setOpen(false),
  }
}

function PlayerEditor({
  player,
  others,
  onClose,
  onArchived,
}: {
  player: Player
  others: Player[]
  onClose: () => void
  onArchived: () => void
}) {
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
    <>
      <SheetTitle title={C.editPlayer(player.name)} onClose={onClose} />
      <div className="group">
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
          <div className="hint shake" key={err} role="alert" style={{ color: 'var(--coral-text)' }}>
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
      </div>
      <div className="group">
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
            onArchived()
          }}
        />
      </div>
    </>
  )
}

function PlayersSection() {
  const a = useActions()
  const players = useTally((s) => s.data.players)
  const live = players.filter((p) => !p.archived)
  const archived = players.filter((p) => p.archived)
  const editor = useEditor(live)
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
      {live.map((p) => (
        <div className="player-line" key={p.id}>
          <Chip name={p.name} color={p.color} size={34} />
          <span className="n">{p.name}</span>
          <IconButton
            icon="pencil"
            label={C.editPlayer(p.name)}
            aria-haspopup="dialog"
            onClick={() => editor.show(p.id)}
          />
        </div>
      ))}
      <Sheet
        open={editor.open}
        onClose={editor.close}
        label={editor.item ? C.editPlayer(editor.item.name) : C.players}
      >
        {editor.item && (
          <PlayerEditor
            key={editor.item.id}
            player={editor.item}
            others={live.filter((q) => q.id !== editor.item?.id)}
            onClose={editor.close}
            onArchived={editor.dismiss}
          />
        )}
      </Sheet>
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

function PresetEditor({
  preset,
  onClose,
  onDeleted,
}: {
  preset: Preset
  onClose: () => void
  onDeleted: () => void
}) {
  const a = useActions()
  const [name, setName] = useState(preset.name)
  const [target, setTarget] = useState(preset.target ? String(preset.target) : '')
  const save = (patch: Partial<Preset>) => a.upsertPreset({ ...preset, ...patch })
  const commitTarget = (raw: string) => {
    const n = Number.parseInt(raw, 10)
    if (n > 0) save({ target: n })
  }
  return (
    <>
      <SheetTitle title={C.editGame(preset.name)} onClose={onClose} />
      <div className="group">
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
        {/* The target row and the open-ended line share one cell, so the sheet keeps its height. */}
        <div className="stack">
          <div
            className={cx('row2', preset.goal === 'open' && 'off')}
            style={{ alignItems: 'center' }}
          >
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
          <span className={cx('hint slot', preset.goal !== 'open' && 'off')}>
            {COPY.newGame.openHint}
          </span>
        </div>
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
      </div>
      <ConfirmButton
        label={C.deleteGame}
        armedLabel={C.deleteGameArmed}
        icon="trash"
        onArm={() => a.play('error')}
        onConfirm={() => {
          a.play('del')
          a.deletePreset(preset.id)
          a.showToast(COPY.toast.gameRemoved(preset.name))
          onDeleted()
        }}
      />
    </>
  )
}

function GamesSection() {
  const a = useActions()
  const presets = useTally((s) => s.data.presets)
  const editor = useEditor(presets)
  const addGame = () => {
    const id = uniqueId(
      C.newGameName,
      presets.map((p) => p.id),
    )
    a.upsertPreset({ id, name: C.newGameName, goal: 'score', target: 100, lowWins: false })
    editor.show(id, 'add')
  }
  return (
    <section className="group" aria-labelledby="set-games">
      <SectionTitle>
        <span id="set-games">{C.games}</span>
      </SectionTitle>
      {presets.map((p) => (
        <div className="player-line" key={p.id}>
          <span className="n" style={{ display: 'flex', flexDirection: 'column' }}>
            {p.name}
            <span className="hint" style={{ fontWeight: 700, color: 'var(--muted)' }}>
              {goalLabel(p)}
            </span>
          </span>
          <IconButton
            icon="pencil"
            label={C.editGame(p.name)}
            aria-haspopup="dialog"
            onClick={() => editor.show(p.id)}
          />
        </div>
      ))}
      <Button variant="ghost" block icon="plus" iconSize={18} onClick={addGame}>
        {C.addGame}
      </Button>
      <Sheet
        open={editor.open}
        onClose={editor.close}
        label={editor.item ? C.editGame(editor.item.name) : C.games}
      >
        {editor.item && (
          <PresetEditor
            key={editor.item.id}
            preset={editor.item}
            onClose={editor.close}
            onDeleted={editor.dismiss}
          />
        )}
      </Sheet>
    </section>
  )
}

/** `tally-ho-2026-10-15.json`, in the phone's own calendar. */
const exportName = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `tally-ho-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`
}

/** Every game, player and preset as a JSON file download. */
function downloadRecord(data: { players: unknown; presets: unknown; games: unknown }) {
  const now = new Date()
  const record = {
    exportedAt: now.toISOString(),
    players: data.players,
    presets: data.presets,
    games: data.games,
  }
  const blob = new Blob([`${JSON.stringify(record, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = exportName(now)
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const F = COPY.family

function FamilySection() {
  const a = useActions()
  const api = useSession()
  const store = useTallyStore()
  const roster = useRoster()
  if (!api.enabled) return null
  const { session } = api
  return (
    <section className="group" aria-labelledby="set-family">
      <SectionTitle>
        <span id="set-family">{F.heading}</span>
      </SectionTitle>
      {session.mode === 'demo' ? (
        <>
          <span className="hint">{F.demoHint}</span>
          <Button block icon="lock" iconSize={20} onClick={() => a.openSheet({ type: 'signin' })}>
            {F.signIn}
          </Button>
          <Button
            variant="ghost"
            block
            icon="repeat"
            iconSize={18}
            onClick={() => {
              a.play('tap')
              api.resetDemo()
            }}
          >
            {F.resetDemo}
          </Button>
          <span className="hint">{F.resetDemoHint}</span>
        </>
      ) : (
        <>
          <div className="family-who">
            <Chip
              name={session.member.name}
              color={roster.colorOf(session.member.playerId)}
              size={34}
            />
            <span className="n">
              {F.signedInAs(session.member.name)}
              <span className="hint">{session.member.email}</span>
            </span>
            <SyncBadge
              state={api.sync?.state ?? 'synced'}
              onClick={(label) => {
                a.play('tap')
                a.showToast(label)
              }}
            />
          </div>
          <span className="hint">{F.syncedHint}</span>
          <Button
            variant="ghost"
            block
            icon="download"
            iconSize={18}
            onClick={() => {
              a.play('tap')
              downloadRecord(store.getState().data)
              a.showToast(F.exported)
            }}
          >
            {F.exportRecord}
          </Button>
          <span className="hint">{F.exportHint}</span>
          <ConfirmButton
            label={F.signOut}
            armedLabel={F.signOutArmed}
            icon="lock"
            onArm={() => a.play('error')}
            onConfirm={() => {
              a.play('close')
              api.signOut().catch(() => a.showToast(F.signOutFailed))
            }}
          />
        </>
      )}
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
      <FamilySection />
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
    </>
  )
}
