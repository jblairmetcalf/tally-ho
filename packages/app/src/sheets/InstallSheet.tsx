import { Button, Eyebrow, FoxNote, QrCode, SheetTitle, type Step, StepList } from '@tally/ui'
import type { ReactNode } from 'react'
import { useActions } from '../context'
import { COPY } from '../copy'
import { type InstallApi, useInstall, useShareUrl } from '../install'

const I = COPY.install

/** "Tap **Share** in the toolbar" → the bold words as <b>. */
function rich(text: string): ReactNode {
  return text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))
}

const IOS: Step[] = [
  { text: rich(I.iosShare), icon: 'share' },
  { text: rich(I.iosAdd), icon: 'addSquare' },
  { text: rich(I.iosConfirm) },
]
const IOS_OTHER: Step[] = [{ text: rich(I.iosOtherShare), icon: 'share' }, ...IOS.slice(1)]
const ANDROID: Step[] = [
  { text: rich(I.androidMenu), icon: 'more' },
  { text: rich(I.androidInstall), icon: 'addSquare' },
  { text: rich(I.androidConfirm) },
]
const DESKTOP: Step[] = [
  { text: rich(I.desktopIcon), icon: 'install' },
  { text: rich(I.desktopConfirm) },
]

/** Chromium offered its prompt: one big button. Otherwise the browser menu's steps. */
function InstallHere({
  install,
  steps,
  body,
}: {
  install: InstallApi
  steps: Step[]
  body: string
}) {
  const a = useActions()
  if (install.canPrompt)
    return (
      <div className="group">
        <span className="hint">{body}</span>
        <Button
          block
          icon="addSquare"
          onClick={async () => {
            a.play('tap')
            if ((await install.prompt()) === 'accepted') a.play('submit')
          }}
        >
          {I.promptButton}
        </Button>
      </div>
    )
  return <StepList label={I.steps} steps={steps} />
}

/**
 * How to add Tally Ho! to the Home Screen, for this phone: iPhone Safari's Share steps, other
 * iPhone browsers (with a nudge to Safari), Chromium's one-tap prompt or its menu, and on a
 * computer a QR code to open it on the phone. Already installed: "You're all set".
 * The same content as a top-level sheet (the one-time pop-up) and nested in Settings.
 */
export function InstallGuide({ onClose }: { onClose: () => void }) {
  const install = useInstall()
  const url = useShareUrl()
  const { platform } = install

  let body: ReactNode
  if (install.installed) {
    body = <FoxNote layout="center" title={I.installedTitle} body={I.installedBody} />
  } else if (platform === 'ios') {
    const other = install.iosBrowser === 'other'
    body = (
      <>
        <FoxNote layout="center" title={I.hello} body={I.lede} />
        <StepList label={I.steps} steps={other ? IOS_OTHER : IOS} />
        {other && <span className="hint">{I.iosOtherNote}</span>}
        <span className="hint">{I.after}</span>
      </>
    )
  } else if (platform === 'android') {
    body = (
      <>
        <FoxNote layout="center" title={I.hello} body={I.lede} />
        <InstallHere install={install} steps={ANDROID} body={I.promptBody} />
        <span className="hint">{I.after}</span>
      </>
    )
  } else {
    body = (
      <>
        <FoxNote layout="center" title={I.phoneTitle} body={I.phoneBody} />
        <QrCode value={url} label={I.qrLabel(url)} size={176} badge />
        <div className="group">
          <Eyebrow>{I.here}</Eyebrow>
          <InstallHere install={install} steps={DESKTOP} body={I.promptBodyDesktop} />
        </div>
      </>
    )
  }

  return (
    <>
      <SheetTitle title={I.title} onClose={onClose} />
      {body}
      <div className="sheet-cta">
        <Button
          block
          variant={install.canPrompt && !install.installed ? 'ghost' : 'jade'}
          icon="check"
          onClick={onClose}
        >
          {I.done}
        </Button>
      </div>
    </>
  )
}

/** The guide as a top-level sheet (the one-time pop-up, routed in SheetHost). */
export function InstallSheet() {
  const a = useActions()
  return <InstallGuide onClose={() => a.closeSheet()} />
}
