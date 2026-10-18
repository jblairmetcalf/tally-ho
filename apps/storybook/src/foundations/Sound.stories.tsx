import type { Meta, StoryObj } from '@storybook/react'
import { Icon, type IconName, SFX, SFX_CUES, type SfxCue, Switch } from '@tally/ui'
import { useEffect, useState } from 'react'
import { BARE, Mono, Page, pageTheme, Section } from './chrome'

const meta: Meta = { title: 'Foundations/Sound', tags: ['!autodocs'], parameters: BARE }
export default meta
type Story = StoryObj

type Tone = 'jade' | 'amber' | 'coral' | 'lav'

const CUES: Record<SfxCue, { when: string; icon: IconName; tone: Tone; synth: string }> = {
  tap: {
    when: 'A key press, a nav tab, Done on victory.',
    icon: 'check',
    tone: 'lav',
    synth: 'square blip, 35ms',
  },
  pick: {
    when: 'Choosing a pill, resuming a game, sound back on.',
    icon: 'bolt',
    tone: 'lav',
    synth: 'two-note chirp',
  },
  open: { when: 'A sheet slides up.', icon: 'down', tone: 'jade', synth: 'triangle sweep up' },
  close: { when: 'A sheet slides away.', icon: 'x', tone: 'jade', synth: 'triangle sweep down' },
  add: { when: 'A player joins the game.', icon: 'users', tone: 'jade', synth: 'E–B pair' },
  remove: { when: 'A player is taken out.', icon: 'x', tone: 'coral', synth: 'falling square' },
  submit: {
    when: 'A round is scored or saved.',
    icon: 'check',
    tone: 'jade',
    synth: 'C major arpeggio',
  },
  start: {
    when: 'Deal in: a new game starts.',
    icon: 'cards',
    tone: 'amber',
    synth: 'two-voice run',
  },
  lead: {
    when: 'Someone takes the lead (with a toast).',
    icon: 'crown',
    tone: 'amber',
    synth: 'high sparkle',
  },
  match: {
    when: 'Someone reaches match point.',
    icon: 'flame',
    tone: 'amber',
    synth: 'triangle call',
  },
  tie: {
    when: 'Tied at the top: Tiebreak!',
    icon: 'repeat',
    tone: 'coral',
    synth: 'see-saw trill',
  },
  error: {
    when: 'Nope: a form problem, or arming a delete.',
    icon: 'bolt',
    tone: 'coral',
    synth: 'sawtooth drop',
  },
  del: {
    when: 'Something is deleted for real.',
    icon: 'trash',
    tone: 'coral',
    synth: 'long sawtooth dive',
  },
  win: {
    when: 'The fanfare, as the victory overlay lands.',
    icon: 'trophy',
    tone: 'amber',
    synth: 'two-voice fanfare',
  },
  lose: {
    when: 'The sad trombone for last place, 2.3 s after the win.',
    icon: 'flag',
    tone: 'lav',
    synth: 'four falling notes',
  },
}

function Pad({ cue }: { cue: SfxCue }) {
  const c = CUES[cue]
  const [k, setK] = useState(0)
  return (
    <button
      type="button"
      className="card flex flex-col items-start gap-2 text-left transition-transform active:scale-95"
      style={{ boxShadow: `0 4px 0 var(--${c.tone})`, borderColor: `var(--${c.tone})` }}
      onClick={() => {
        SFX[cue]()
        setK((x) => x + 1)
      }}
    >
      <span className="flex w-full items-center gap-3">
        <span
          key={k}
          className="grid h-[44px] w-[44px] place-items-center rounded-[12px]"
          style={{
            background: `var(--${c.tone})`,
            color: 'var(--on-accent)',
            animation: k ? 'pop .35s var(--spring)' : undefined,
          }}
        >
          <Icon name={c.icon} size={22} />
        </span>
        <span className="display text-[26px]">{cue}</span>
      </span>
      <span className="text-[13.5px]">{c.when}</span>
      <Mono className="text-faint">{c.synth}</Mono>
    </button>
  )
}

function Board() {
  const [muted, setMuted] = useState(SFX.isMuted())
  useEffect(() => () => SFX.setMuted(false), [])
  return (
    <>
      <div className="card flex items-center gap-4">
        <span
          className="grid h-[52px] w-[52px] place-items-center rounded-[14px]"
          style={{
            background: muted ? 'var(--sunk)' : 'var(--jade)',
            color: muted ? 'var(--muted)' : 'var(--on-accent)',
          }}
        >
          <Icon name={muted ? 'mute' : 'volume'} size={26} />
        </span>
        <div className="flex-1">
          <b className="display text-[22px]">{muted ? 'Muted' : 'Sound on'}</b>
          <p className="hint m-0">
            The app's speaker button calls SFX.setMuted. Try a pad while muted: silence.
          </p>
        </div>
        <Switch
          checked={!muted}
          label="Sound"
          onChange={(on) => {
            SFX.setMuted(!on)
            setMuted(!on)
            if (on) SFX.pick()
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SFX_CUES.map((cue) => (
          <Pad key={cue} cue={cue} />
        ))}
      </div>
    </>
  )
}

export const Sound: Story = {
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      title="Sound"
      lede={
        <>
          Tally Ho! bleeps. Every cue is a few lines of Web Audio — square and triangle waves,
          straight out of an 8-bit game — synthesised on the spot, so nothing is downloaded. Call
          them as <Mono>SFX.submit()</Mono>; components never play sounds themselves, the store
          does. Turn your volume up and play the board.
        </>
      }
    >
      <Section
        title="The soundboard"
        note={`${SFX_CUES.length} cues, in the order a game uses them.`}
      >
        <Board />
      </Section>
      <Section title="Rules" note="Sound is feedback, never information on its own.">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [
              'Unlock on first touch',
              "Sounds play through the iPhone's silent switch (a playback audio session), created by the tap that plays them. Audio is handed back to iOS after 6 seconds of quiet, when the app is hidden (SFX.sleep()), and whenever sound is muted, so music elsewhere is interrupted only while Tally Ho! is actually making noise. The sound button is the only toggle.",
            ],
            [
              'One cue per moment',
              'A scored round plays submit; a lead change follows 700 ms later. Never stack two at once.',
            ],
            [
              'Always paired',
              'Every sound has a visual twin (a toast, a ribbon, a shake), so muted players miss nothing.',
            ],
          ].map(([t, b]) => (
            <div key={t} className="card flex flex-col gap-1">
              <b>{t}</b>
              <span className="text-[13.5px] text-muted">{b}</span>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  ),
}
