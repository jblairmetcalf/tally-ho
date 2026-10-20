import { computeStats, computeStickers, isCompleted, STICKERS, stickersOf } from '@tally/core'
import { type IconName, Pill, PillRow, SheetTitle, Sticker } from '@tally/ui'
import { type CSSProperties, useMemo, useState } from 'react'
import { useActions, useRoster, useTally } from '../context'
import { COPY } from '../copy'

const S = COPY.stickers

/**
 * A player's sticker book (the Sticker Club, decision 24): everyone who has played as pills to
 * switch between, how many of the twelve they have, and the album itself, earned stickers
 * peeled on (×N for repeats) and the rest as dashed outlines with how to earn them.
 */
export function StickerBookSheet({ playerId }: { playerId?: string }) {
  return <StickerBook playerId={playerId} switchable />
}

/**
 * The book itself. `switchable` (its own sheet): a title and player pills to look at anyone's.
 * Not switchable (a page pushed from a game's details): one player's, titled by the page.
 */
export function StickerBook({
  playerId,
  switchable = false,
}: {
  playerId?: string
  switchable?: boolean
}) {
  const a = useActions()
  const roster = useRoster()
  const games = useTally((s) => s.data.games)
  const done = useMemo(() => games.filter(isCompleted), [games])
  const book = useMemo(() => computeStickers(done), [done])
  // Everyone who has finished a game, in standings order.
  const players = useMemo(
    () => computeStats(done, roster.nameOf).standings.map((x) => x.id),
    [done, roster.nameOf],
  )
  const [who, setWho] = useState(() => playerId ?? players[0] ?? '')
  const name = roster.nameOf(who)
  const counts = book.counts[who] ?? {}
  const got = stickersOf(book, who)
  return (
    <>
      {switchable && <SheetTitle title={S.book(name)} onClose={() => a.closeSheet()} />}
      {switchable && players.length > 1 && (
        <PillRow scroll label={S.who}>
          {players.map((id) => (
            <Pill
              key={id}
              on={id === who}
              onClick={() => {
                if (id === who) return
                a.play('sticker')
                setWho(id)
              }}
              chip={{ name: roster.nameOf(id), color: roster.colorOf(id) }}
            >
              {roster.nameOf(id)}
            </Pill>
          ))}
        </PillRow>
      )}
      <div className="sticker-meter">
        <div className="bar">
          <i style={{ width: `${(got / STICKERS.length) * 100}%` }} />
        </div>
        <span>{S.meter(got, STICKERS.length)}</span>
      </div>
      <ul className="sticker-grid" key={who}>
        {STICKERS.map((k, i) => {
          const n = counts[k.id] ?? 0
          const label = S.names[k.id]
          return (
            <li key={k.id} className={n ? 'got' : undefined} style={{ '--i': i } as CSSProperties}>
              <Sticker
                label={n ? S.times(label, n) : S.locked(label)}
                tone={k.tone}
                icon={k.icon as IconName}
                shape={k.shape}
                locked={!n}
                count={n}
                tilt={((i * 37) % 11) - 5}
                size={64}
              />
              <b className="name">{label}</b>
              <span className="rule">{S.rules[k.id]}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}
