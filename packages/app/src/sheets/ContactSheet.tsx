import { ButtonLink, FoxNote } from '@tally/ui'
import { useActions } from '../context'
import { COPY } from '../copy'

const K = COPY.contact

/**
 * Say hi to the maker: who built it, why, and a link to his site (a new tab). No email.
 * A page in Settings (the nav header gives it its title, back and close).
 */
export function ContactContent() {
  const a = useActions()
  return (
    <>
      <FoxNote layout="center" wink title={K.hello} body={K.body} />
      <div className="sheet-cta">
        <ButtonLink
          href={K.url}
          external
          block
          icon="external"
          iconSize={20}
          onClick={() => a.play('tap')}
        >
          {K.visit}
        </ButtonLink>
      </div>
    </>
  )
}
