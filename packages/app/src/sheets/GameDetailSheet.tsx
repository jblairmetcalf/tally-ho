import {
  type CompletedGame,
  computeStickers,
  goalLabel,
  isCompleted,
  ranked,
  totalsOf,
} from '@tally/core'
import {
  Button,
  ConfirmButton,
  Eyebrow,
  Podium,
  RoundLog,
  SheetNav,
  type SheetNavPage,
  SongStrip,
  StickerShelf,
} from '@tally/ui'
import { useMemo, useState } from 'react'
import { useActions, useRoster, useTally } from '../context'
import { COPY, longDate } from '../copy'
import { useStaff } from '../mixtape'
import { playerOfShelf, shelfItems } from '../stickerShelf'
import { StickerBook } from './StickerBookSheet'

/**
 * A finished game, in a sheet with a page stack: the game itself, and a sticker from it pushes
 * that player's sticker book (back returns to the game).
 */
export function GameDetailSheet({ game: g }: { game: CompletedGame }) {
  const a = useActions()
  const roster = useRoster()
  const [book, setBook] = useState<string | null>(null)
  const pages: SheetNavPage[] = [
    {
      key: 'game',
      title: g.name,
      content: (
        <GameDetail
          game={g}
          onSticker={(id) => {
            a.play('sticker')
            setBook(id)
          }}
        />
      ),
    },
  ]
  if (book)
    pages.push({
      key: `book:${book}`,
      title: COPY.stickers.book(roster.nameOf(book)),
      content: <StickerBook playerId={book} />,
    })
  return (
    <SheetNav
      pages={pages}
      onBack={() => {
        if (!book) return
        a.play('close')
        setBook(null)
      }}
      onClose={() => a.closeSheet()}
      backLabel={COPY.sheetBack}
      closeLabel={COPY.close}
    />
  )
}

function GameDetail({
  game: g,
  onSticker,
}: {
  game: CompletedGame
  onSticker: (playerId: string) => void
}) {
  const a = useActions()
  const roster = useRoster()
  const t = totalsOf(g)
  const games = useTally((s) => s.data.games)
  const song = useTally((s) => s.song)
  const staff = useStaff(g)
  const playing = song?.gameId === g.id && song.key === 'detail' && song.whole
  // Stickers depend on every game before this one (streaks, firsts), so the whole history counts.
  const earned = useMemo(
    () => computeStickers(games.filter(isCompleted)).byGame[g.id] ?? [],
    [games, g.id],
  )
  return (
    <>
      <div className="hint" style={{ color: 'var(--muted)' }}>
        {COPY.detail.sub(longDate(g.completedAt), g.rounds.length, goalLabel(g), !!g.sample)}
      </div>
      <div className="group">
        <Podium
          wide
          rows={[g.winnerId, ...ranked(g).filter((id) => id !== g.winnerId)].map((id) => ({
            id,
            name: roster.nameOf(id),
            color: roster.colorOf(id),
            total: t[id] ?? 0,
          }))}
          delayMs={0}
        />
      </div>
      <SongStrip
        song={staff}
        playing={playing}
        onPlay={() => a.playSong(g.id, 'detail')}
        label={playing ? COPY.foxTrot.stop(g.name) : COPY.foxTrot.play(g.name)}
      />
      <RoundLog
        players={roster.people(g.playerIds)}
        rounds={g.rounds}
        lowWins={g.lowWins}
        mode={g.goal === 'wins' ? 'wins' : 'scores'}
        wonLabel={COPY.game.wonRound}
        editable={false}
        style={{ padding: 6 }}
      />
      {earned.length > 0 && (
        <div className="group">
          <Eyebrow>{COPY.stickers.fromGame}</Eyebrow>
          <StickerShelf
            label={COPY.stickers.fromGame}
            items={shelfItems(earned, roster.nameOf, (e, i) => `${e.id}-${i}`)}
            onPick={(key) => onSticker(playerOfShelf(key))}
          />
        </div>
      )}
      <Button block icon="repeat" onClick={() => a.rematch(g)}>
        {COPY.detail.rematch}
      </Button>
      <ConfirmButton
        label={COPY.detail.del}
        armedLabel={COPY.detail.armed}
        icon="trash"
        onArm={() => a.play('error')}
        onConfirm={() => a.deleteGame(g.id)}
      />
    </>
  )
}
