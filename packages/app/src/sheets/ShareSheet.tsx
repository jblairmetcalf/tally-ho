import { Button, QrCode, SheetTitle } from '@tally/ui'
import { useActions } from '../context'
import { COPY } from '../copy'
import { useShareUrl } from '../install'

const S = COPY.share

/** The old way, for browsers without the async clipboard (or without permission to use it). */
function copyByHand(text: string): boolean {
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  field.remove()
  return ok
}

/**
 * Share the game: a QR code of wherever Tally Ho! is running (the Vercel address once
 * deployed), the address itself, the phone's share sheet when there is one, and Copy link.
 */
export function ShareContent({ onClose }: { onClose: () => void }) {
  const a = useActions()
  const url = useShareUrl()
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(url)
      ok = true
    } catch {
      ok = copyByHand(url)
    }
    a.play(ok ? 'pick' : 'error')
    a.showToast(ok ? S.copied : S.copyFailed)
  }

  return (
    <>
      <SheetTitle title={S.title} onClose={onClose} />
      <p className="share-lede">{S.lede}</p>
      <QrCode value={url} label={S.qrLabel(url)} size={232} badge />
      <p className="share-url selectable">{url}</p>
      <div className="sheet-cta">
        <div className="row2">
          {canShare && (
            <Button
              variant="ghost"
              icon="share"
              iconSize={20}
              onClick={() => {
                a.play('tap')
                navigator.share({ title: S.shareTitle, text: S.shareText, url }).catch(() => {})
              }}
            >
              {S.share}
            </Button>
          )}
          <Button icon="link" iconSize={20} onClick={copy}>
            {S.copy}
          </Button>
        </div>
      </div>
    </>
  )
}
