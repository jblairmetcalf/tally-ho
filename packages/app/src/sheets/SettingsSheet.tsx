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
  SheetNav,
  type SheetNavPage,
  Swatches,
  Switch,
  SyncBadge,
  TextInput,
} from '@tally/ui'
import { type ReactNode, useState } from 'react'
import { buildStamp } from '../build'
import { useActions, useRoster, useTally, useTallyStore } from '../context'
import { COPY } from '../copy'
import { useInstall } from '../install'
import { uniqueId } from '../store'
import { useSession } from '../sync/session'
import { ContactContent } from './ContactSheet'
import { GoalFields, refill, type Targets, targetsFor } from './GoalFields'
import { InstallGuide } from './InstallSheet'
import { ShareContent } from './ShareSheet'
import { SignInContent } from './SignInSheet'

const C = COPY.settings

/** Settings › Players › Edit Kate: name, colour, archive (which goes back to the line-up). */
function PlayerEditor({
  player,
  others,
  onArchived,
}: {
  player: Player
  others: Player[]
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

/** Settings › Players: the line-up, each player's editor a page pushed over it, and Add a player. */
function PlayersContent({ onEdit }: { onEdit: (id: string) => void }) {
  const a = useActions()
  const players = useTally((s) => s.data.players)
  const live = players.filter((p) => !p.archived)
  const archived = players.filter((p) => p.archived)
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
    <div className="group">
      {live.map((p) => (
        <div className="player-line" key={p.id}>
          <Chip name={p.name} color={p.color} size={34} />
          <span className="n">{p.name}</span>
          <IconButton icon="pencil" label={C.editPlayer(p.name)} onClick={() => onEdit(p.id)} />
        </div>
      ))}
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
    </div>
  )
}

/** Settings › Games › Edit Uno: name, how it ends, low-wins, delete (back to the list). */
function PresetEditor({ preset, onDeleted }: { preset: Preset; onDeleted: () => void }) {
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
 * Add a game: a draft held here until "Add game", so going back (or never naming it) leaves no
 * empty row behind. The add button waits for a name the family doesn't have yet; adding goes
 * back to Games.
 */
function GameCreator({ onDone }: { onDone: () => void }) {
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

/** Settings › Games: every game and how it ends; Add a game and each editor are pages pushed over it. */
function GamesContent({ onEdit, onAdd }: { onEdit: (id: string) => void; onAdd: () => void }) {
  const presets = useTally((s) => s.data.presets)
  return (
    <>
      <div className="group">
        {presets.map((p) => (
          <div className="player-line" key={p.id}>
            <span className="n" style={{ display: 'flex', flexDirection: 'column' }}>
              {p.name}
              <span className="hint" style={{ fontWeight: 700, color: 'var(--muted)' }}>
                {presetLabel(p)}
              </span>
            </span>
            <IconButton icon="pencil" label={C.editGame(p.name)} onClick={() => onEdit(p.id)} />
          </div>
        ))}
      </div>
      {/* Adding a game is this page's main action: pinned, however long the list. */}
      <div className="sheet-cta">
        <Button block icon="plus" iconSize={20} onClick={onAdd}>
          {C.addGame}
        </Button>
      </div>
    </>
  )
}

/** Settings › Appearance: theme, sound, haptics, keep awake, and clearing the samples. */
function AppearanceContent() {
  const a = useActions()
  const prefs = useTally((s) => s.data.prefs)
  const hasSamples = useTally((s) => s.data.hasSamples)
  return (
    <div className="group">
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
    </div>
  )
}

/** Players, Games and Appearance: one row each on the landing, each pushing its page. */
function Areas({ go }: { go: (r: Route) => void }) {
  const players = useTally((s) => s.data.players)
  const games = useTally((s) => s.data.presets.length)
  const prefs = useTally((s) => s.data.prefs)
  const names = players.filter((p) => !p.archived).map((p) => p.name)
  return (
    <section className="group" aria-labelledby="set-yours">
      <SectionTitle>
        <span id="set-yours">{C.yours}</span>
      </SectionTitle>
      <LinkRow
        icon="users"
        tone="fox"
        title={C.players}
        hint={C.playersHint(names)}
        onClick={() => go('players')}
      />
      <LinkRow
        icon="cards"
        tone="lav"
        title={C.games}
        hint={C.gamesHint(games)}
        onClick={() => go('games')}
      />
      <LinkRow
        icon="sun"
        tone="jade"
        title={C.appearance}
        hint={C.appearanceHint(C.themes[prefs.theme], !prefs.muted)}
        onClick={() => go('appearance')}
      />
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

/** Family, inline at the bottom of the landing; signing in is a page pushed over it. */
function FamilySection({ go }: { go: (r: Route) => void }) {
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
          <Button block icon="lock" iconSize={20} onClick={() => go('signin')}>
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

/** Three ways out near the top of Settings (install, share, the maker), each pushing its page. */
function Corners({ go }: { go: (r: Route) => void }) {
  const install = useInstall()
  return (
    <section className="group" aria-label={C.more}>
      <LinkRow
        icon="phone"
        tone="jade"
        title={C.install}
        hint={install.installed ? C.installedHint : C.installHint}
        onClick={() => go('install')}
      />
      <LinkRow
        icon="share"
        tone="amber"
        title={C.share}
        hint={C.shareHint}
        onClick={() => go('share')}
      />
      <LinkRow
        icon="heart"
        tone="coral"
        title={C.contact}
        hint={C.contactHint}
        onClick={() => go('contact')}
      />
    </section>
  )
}

/** Every page Settings can push. Editors carry the id of what they edit. */
export type Route =
  | 'root'
  | 'install'
  | 'share'
  | 'contact'
  | 'players'
  | `player:${string}`
  | 'games'
  | `game:${string}`
  | 'add-game'
  | 'appearance'
  | 'signin'

/**
 * Settings is one sheet with a navigation stack (`SheetNav`): a short landing (the fox, install /
 * share / the maker, then Players, Games and Appearance, Family inline, the build line), and
 * every row pushes its page from the right; editors (Edit Kate, Add a game, Edit Uno) push a
 * third. Back (top left, or Escape) pops one page; Close (top right) closes it all.
 */
export function SettingsSheet() {
  const a = useActions()
  const session = useSession()
  const players = useTally((s) => s.data.players)
  const presets = useTally((s) => s.data.presets)
  const [stack, setStack] = useState<Route[]>(['root'])

  const livePlayer = (id: string) => players.find((p) => p.id === id && !p.archived)
  const preset = (id: string) => presets.find((p) => p.id === id)
  // An editor whose player or game is gone (archived here, or on another phone) drops out.
  const valid = stack.filter((r) =>
    r.startsWith('player:')
      ? !!livePlayer(r.slice(7))
      : r.startsWith('game:')
        ? !!preset(r.slice(5))
        : true,
  )

  const go = (r: Route) => {
    a.play('open')
    // Seen from Settings counts too: the guide won't pop up by itself after this.
    if (r === 'install') a.setPref('installHintSeen', true)
    setStack([...valid, r])
  }
  /** Back one page, silently (archive, delete and add play their own cue). */
  const pop = () => setStack(valid.slice(0, -1))
  const back = () => {
    if (valid.length < 2) return
    a.play('close')
    pop()
  }

  const page = (r: Route): SheetNavPage | null => {
    const p = (title: string, content: ReactNode): SheetNavPage => ({ key: r, title, content })
    if (r === 'root')
      return p(
        C.title,
        <>
          <FoxNote title={C.hello} body={C.helloBody} />
          {/* Install / share / say hi first, then the family's own setup, then sign-in last. */}
          <Corners go={go} />
          <Areas go={go} />
          <FamilySection go={go} />
          <p className="hint" style={{ margin: 0, textAlign: 'center' }} data-testid="build-stamp">
            {C.about(buildStamp(), session.enabled)}
          </p>
        </>,
      )
    if (r === 'install') return p(COPY.install.title, <InstallGuide onDone={back} />)
    if (r === 'share') return p(COPY.share.title, <ShareContent />)
    if (r === 'contact') return p(COPY.contact.title, <ContactContent />)
    if (r === 'players') return p(C.players, <PlayersContent onEdit={(id) => go(`player:${id}`)} />)
    if (r === 'games')
      return p(
        C.games,
        <GamesContent onEdit={(id) => go(`game:${id}`)} onAdd={() => go('add-game')} />,
      )
    if (r === 'add-game') return p(C.addGameTitle, <GameCreator onDone={pop} />)
    if (r === 'appearance') return p(C.appearance, <AppearanceContent />)
    if (r === 'signin') return p(COPY.signIn.title, <SignInContent onDone={back} />)
    if (r.startsWith('player:')) {
      const player = livePlayer(r.slice(7))
      if (!player) return null
      return p(
        C.editPlayer(player.name),
        <PlayerEditor
          player={player}
          others={players.filter((q) => !q.archived && q.id !== player.id)}
          onArchived={pop}
        />,
      )
    }
    const game = preset(r.slice(5))
    return game ? p(C.editGame(game.name), <PresetEditor preset={game} onDeleted={pop} />) : null
  }

  return (
    <SheetNav
      pages={valid.map(page).filter((x): x is SheetNavPage => !!x)}
      onBack={back}
      onClose={() => a.closeSheet()}
      backLabel={COPY.sheetBack}
      closeLabel={COPY.close}
    />
  )
}
