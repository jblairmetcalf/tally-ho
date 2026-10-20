import type { Game } from '@tally/core'
import { SheetNav, type SheetNavPage } from '@tally/ui'
import { useActions } from '../context'
import { COPY } from '../copy'
import type { GamePage } from '../store'
import { EditRoundSheet } from './EditRoundSheet'
import { EndGameSheet } from './EndGameSheet'
import { GameBoard } from './GameBoard'

/**
 * The game, in a sheet over Home: the scoreboard is the root page (titled with the game's name),
 * and Edit round / End game push from the right inside the same sheet. Close (top right, a drag,
 * or Escape at the root) puts it away with the game still live; Resume brings it back.
 */
export function GameSheet({ game: g, page }: { game: Game; page?: GamePage }) {
  const a = useActions()
  const pages: SheetNavPage[] = [{ key: 'game', title: g.name, content: <GameBoard game={g} /> }]
  if (page?.type === 'round' && g.rounds[page.idx])
    pages.push({
      key: `round:${page.idx}`,
      title: COPY.editRound.title(page.idx + 1),
      content: <EditRoundSheet game={g} idx={page.idx} />,
    })
  if (page?.type === 'end' && !g.winnerId)
    pages.push({
      key: 'end',
      title: COPY.endGame.title(g.name),
      content: <EndGameSheet game={g} />,
    })
  return (
    <SheetNav
      pages={pages}
      onBack={a.gameBack}
      onClose={() => a.closeSheet()}
      backLabel={COPY.sheetBack}
      closeLabel={COPY.close}
    />
  )
}
