import { goalLabel, type Player, type Preset, type ThemePref } from '@tally/core'
import {
  Button,
  Chip,
  ConfirmButton,
  Eyebrow,
  FoxNote,
  Icon,
  IconButton,
  LinkRow,
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
import { useInstall } from '../install'
import { uniqueId } from '../store'
import { useSession } from '../sync/session'
import { ContactContent } from './ContactSheet'
import { GoalFields, refill, type Targets, targetsFor } from './GoalFields'
import { InstallGuide } from './InstallSheet'
import { ShareContent } from './ShareSheet'
import { SignInSheet } from './SignInSheet'

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
        <Button
          variant="ghost"
          icon="plus"
          iconSize={18}
          style={{ flex: 'none' }}
          onClick={add}
          disabled={!np.trim()}
        >
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
  const [targets, setTargets] = useState<Targets>(() => targetsFor(preset.goal, preset.target))
  // One round per player follows the line-up: show the family's usual table size.
  const lineup = useTally((s) => {
    const live = new Set(s.data.players.filter((p) => !p.archived).map((p) => p.id))
    return s.data.lastPlayerIds.filter((id) => live.has(id)).length || live.size
  })
  const save = (patch: Partial<Preset>) => a.upsertPreset({ ...preset, ...patch })
  const goal = preset.goal
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
        <GoalFields
          goal={goal}
          target={goal === 'open' ? '' : targets[goal]}
          lowWins={preset.lowWins}
          perPlayer={!!preset.roundsPerPlayer}
          lineup={lineup}
          onGoal={(next) => {
            a.play('tap')
            const full = refill(targets, next)
            setTargets(full)
            const tg = next === 'open' ? null : Number.parseInt(full[next], 10)
            // "Who won?" has no points, so it can't be low-wins.
            save({ goal: next, target: tg, ...(next === 'wins' ? { lowWins: false } : {}) })
          }}
          onTarget={(v) => {
            if (goal === 'open') return
            setTargets((t) => ({ ...t, [goal]: v }))
            const n = Number.parseInt(v, 10)
            if (n > 0) save({ target: n })
          }}
          onLowWins={(v) => {
            a.play('tap')
            save({ lowWins: v })
          }}
          onPerPlayer={(v) => {
            a.play('tap')
            save({ roundsPerPlayer: v })
          }}
        />
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

/**
 * Add a game: a draft held here until "Add game", so closing the sheet (or never naming it)
 * leaves no empty row behind. The add button waits for a name the family doesn't have yet.
 */
function GameCreator({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const a = useActions()
  const presets = useTally((s) => s.data.presets)
  const lineup = useTally((s) => {
    const live = new Set(s.data.players.filter((p) => !p.archived).map((p) => p.id))
    return s.data.lastPlayerIds.filter((id) => live.has(id)).length || live.size
  })
  const [name, setName] = useState('')
  const [goal, setGoal] = useState<Preset['goal']>('score')
  const [targets, setTargets] = useState<Targets>(() => targetsFor('score', 100))
  const [lowWins, setLowWins] = useState(false)
  const [perPlayer, setPerPlayer] = useState(false)
  const trimmed = name.trim()
  const taken = presets.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase())
  const target = goal === 'open' ? null : Number.parseInt(targets[goal], 10)
  const ready = !!trimmed && !taken && (goal === 'open' || (target ?? 0) > 0)
  const add = () => {
    if (!ready) return
    const id = uniqueId(
      trimmed,
      presets.map((p) => p.id),
    )
    a.upsertPreset({
      id,
      name: trimmed,
      goal,
      target,
      lowWins: goal === 'wins' ? false : lowWins,
      ...(goal === 'rounds' && perPlayer ? { roundsPerPlayer: true } : {}),
    })
    a.play('add')
    a.showToast(COPY.toast.gameAdded(trimmed))
    onDone()
  }
  return (
    <>
      <SheetTitle title={C.addGameTitle} onClose={onClose} />
      <p className="hint" style={{ margin: 0 }}>
        {C.addGameHint}
      </p>
      <div className="group">
        <TextInput
          aria-label={C.gameName}
          placeholder={C.gameName}
          value={name}
          maxLength={32}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          enterKeyHint="done"
        />
        {taken && (
          <span className="hint" role="status" style={{ color: 'var(--coral-text)' }}>
            {C.nameTaken(trimmed)}
          </span>
        )}
        <GoalFields
          goal={goal}
          target={goal === 'open' ? '' : targets[goal]}
          lowWins={lowWins}
          perPlayer={perPlayer}
          lineup={lineup}
          onGoal={(next) => {
            a.play('tap')
            setTargets((t) => refill(t, next))
            setGoal(next)
            if (next === 'wins') setLowWins(false)
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
          }}
        />
      </div>
      <div className="sheet-cta">
        <Button block icon="plus" iconSize={20} disabled={!ready} onClick={add}>
          {C.addGameSave}
        </Button>
      </div>
    </>
  )
}

/** The line under a game in Settings: its goal, or "One round per player" (Scout). */
const presetLabel = (p: Preset) =>
  p.goal === 'rounds' && p.roundsPerPlayer ? COPY.newGame.perPlayer : goalLabel(p)

function GamesSection() {
  const a = useActions()
  const presets = useTally((s) => s.data.presets)
  const editor = useEditor(presets)
  // A new game is a draft in its own sheet until it's added: no empty rows.
  const [adding, setAdding] = useState(false)
  const [addKey, setAddKey] = useState(0)
  const addGame = () => {
    a.play('open')
    setAddKey((k) => k + 1)
    setAdding(true)
  }
  const closeAdd = () => {
    a.play('close')
    setAdding(false)
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
              {presetLabel(p)}
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
      <Button
        variant="ghost"
        block
        icon="plus"
        iconSize={18}
        aria-haspopup="dialog"
        onClick={addGame}
      >
        {C.addGame}
      </Button>
      <Sheet open={adding} onClose={closeAdd} label={C.addGameTitle}>
        <GameCreator key={addKey} onClose={closeAdd} onDone={() => setAdding(false)} />
      </Sheet>
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
  // Sign-in layers over Settings like the editors, so closing it lands back here.
  const [signingIn, setSigningIn] = useState(false)
  const openSignIn = () => {
    a.play('open')
    setSigningIn(true)
  }
  const closeSignIn = () => {
    a.play('close')
    setSigningIn(false)
  }
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
          <Button block icon="lock" iconSize={20} aria-haspopup="dialog" onClick={openSignIn}>
            {F.signIn}
          </Button>
          <Sheet open={signingIn} onClose={closeSignIn} label={COPY.sheetLabel.signin}>
            <SignInSheet onClose={closeSignIn} />
          </Sheet>
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

type Corner = 'install' | 'share' | 'contact'

/**
 * The friendly top of Settings: the fox says hi, then three ways out (install, share, the
 * maker), each a sheet nested over Settings.
 */
function Landing() {
  const a = useActions()
  const install = useInstall()
  const [open, setOpen] = useState<Corner | null>(null)
  const show = (which: Corner) => {
    a.play('open')
    setOpen(which)
  }
  const close = () => {
    a.play('close')
    // Seen from Settings counts too: it won't pop up by itself after this.
    if (open === 'install') a.setPref('installHintSeen', true)
    setOpen(null)
  }
  return (
    <section className="group" aria-label={C.more}>
      <FoxNote title={C.hello} body={C.helloBody} className="mb-1.5" />
      <LinkRow
        icon="phone"
        tone="jade"
        title={C.install}
        hint={install.installed ? C.installedHint : C.installHint}
        aria-haspopup="dialog"
        onClick={() => show('install')}
      />
      <LinkRow
        icon="share"
        tone="amber"
        title={C.share}
        hint={C.shareHint}
        aria-haspopup="dialog"
        onClick={() => show('share')}
      />
      <LinkRow
        icon="heart"
        tone="coral"
        title={C.contact}
        hint={C.contactHint}
        aria-haspopup="dialog"
        onClick={() => show('contact')}
      />
      <Sheet open={open === 'install'} onClose={close} label={COPY.sheetLabel.install}>
        <InstallGuide onClose={close} />
      </Sheet>
      <Sheet open={open === 'share'} onClose={close} label={COPY.sheetLabel.share}>
        <ShareContent onClose={close} />
      </Sheet>
      <Sheet open={open === 'contact'} onClose={close} label={COPY.sheetLabel.contact}>
        <ContactContent onClose={close} />
      </Sheet>
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
      <Landing />
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
