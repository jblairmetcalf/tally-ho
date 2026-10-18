import { Button, Icon, SheetTitle, TextInput } from '@tally/ui'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useActions } from '../context'
import { COPY } from '../copy'
import { type Session, SignInError, type SignInErrorCode, useSession } from '../sync/session'

const C = COPY.signIn

const messageFor = (e: unknown): string => {
  const code: SignInErrorCode = e instanceof SignInError ? e.code : 'unknown'
  return C.errors[code] ?? C.errors.unknown
}

/**
 * A sign-in swaps the whole app (it re-keys on the session), so this sheet and its store are
 * gone before it could say welcome. It leaves the email here instead; the new Home picks it
 * up once with `takeWelcome` and toasts.
 */
let welcomeFor: string | null = null

/** The member's name if they just signed in on this phone (once), else null. */
export function takeWelcome(session: Session): string | null {
  if (!welcomeFor) return null
  const match = session.mode === 'family' && session.member.email === welcomeFor
  if (match || session.mode === 'family') welcomeFor = null
  return match && session.mode === 'family' ? session.member.name : null
}

export interface SignInSheetProps {
  /** Stories only: start mid-flow (filled in, spinning, or showing an error). */
  preview?: { email?: string; password?: string; busy?: boolean; error?: SignInErrorCode }
}

export interface SignInContentProps extends SignInSheetProps {
  /** Signed in but the app hasn't re-keyed yet: leave this page or sheet (then it says welcome). */
  onDone: () => void
}

/**
 * Family sign in, the form: a page in Settings (the nav header titles it) or the body of the
 * standalone sign-in sheet. A real `<form>` so password managers and iOS autofill recognise it;
 * Enter submits. While signing in the button spins and the fields hold still; a failure shakes
 * in a `role="alert"` line; success re-keys the app, whose new Home says welcome.
 */
export function SignInContent({ preview, onDone }: SignInContentProps) {
  const a = useActions()
  const api = useSession()
  const [email, setEmail] = useState(preview?.email ?? '')
  const [password, setPassword] = useState(preview?.password ?? '')
  const [busy, setBusy] = useState(preview?.busy ?? false)
  const [err, setErr] = useState<{ msg: string; k: number } | null>(
    preview?.error ? { msg: C.errors[preview.error], k: 0 } : null,
  )
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const fail = (msg: string) => {
    a.play('error')
    setErr((e) => ({ msg, k: (e?.k ?? 0) + 1 }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const em = email.trim()
    if (!em || !password) {
      fail(C.needBoth)
      return
    }
    setBusy(true)
    setErr(null)
    welcomeFor = em.toLowerCase()
    try {
      await api.signIn(em, password)
      // Normally the app has re-keyed by now and Home says welcome. If not, do it here.
      if (alive.current && welcomeFor) {
        welcomeFor = null
        onDone()
        a.showToast(C.welcome(api.session.mode === 'family' ? api.session.member.name : em))
      }
    } catch (x) {
      welcomeFor = null
      if (alive.current) {
        setBusy(false)
        fail(messageFor(x))
      }
    }
  }

  const forgot = async () => {
    const em = email.trim()
    if (!em) {
      fail(C.needEmail)
      return
    }
    a.play('tap')
    try {
      await api.sendPasswordReset(em)
      if (alive.current) {
        setErr(null)
        a.showToast(C.resetSent(em))
      }
    } catch (x) {
      if (alive.current) fail(messageFor(x))
    }
  }

  return (
    <>
      <p className="signin-lede">{C.lede}</p>
      <form className="group" onSubmit={submit} noValidate aria-busy={busy}>
        <label className="field-label" htmlFor="signin-email">
          <span className="eyebrow">{C.email}</span>
          <TextInput
            id="signin-email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            readOnly={busy}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? 'signin-error' : undefined}
          />
        </label>
        <label className="field-label" htmlFor="signin-password">
          <span className="eyebrow">{C.password}</span>
          <TextInput
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            value={password}
            readOnly={busy}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? 'signin-error' : undefined}
          />
        </label>
        {err && (
          <p id="signin-error" className="form-error shake" key={err.k} role="alert">
            {err.msg}
          </p>
        )}
        <Button type="submit" block disabled={busy}>
          {busy ? (
            <>
              <Icon name="repeat" size={20} className="spinning" />
              {C.signingIn}
            </>
          ) : (
            <>
              <Icon name="lock" size={20} />
              {C.submit}
            </>
          )}
        </Button>
      </form>
      <button
        type="button"
        className="link"
        style={{ alignSelf: 'center' }}
        onClick={forgot}
        disabled={busy}
      >
        {C.forgot}
      </button>
    </>
  )
}

/** The standalone sign-in sheet (routed in SheetHost): its title row with close, then the form. */
export function SignInSheet({ preview }: SignInSheetProps = {}) {
  const a = useActions()
  return (
    <>
      <SheetTitle title={C.title} onClose={() => a.closeSheet()} />
      <SignInContent preview={preview} onDone={() => a.closeSheet(true)} />
    </>
  )
}
