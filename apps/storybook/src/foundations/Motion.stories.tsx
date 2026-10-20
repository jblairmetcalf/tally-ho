import type { Meta, StoryObj } from '@storybook/react'
import { Badge, Chip, Fox, Icon, IconButton, Sticker, Wordmark } from '@tally/ui'
import { type CSSProperties, type ReactNode, useState } from 'react'
import motionCss from '../../../../packages/ui/src/styles/motion.css?raw'
import { BARE, Mono, Page, pageTheme, Section, Tag } from './chrome'

const meta: Meta = { title: 'Foundations/Motion', tags: ['!autodocs'], parameters: BARE }
export default meta
type Story = StoryObj

/** Each @keyframes rule's source, by name, read from motion.css itself. */
const SOURCE: Record<string, string> = Object.fromEntries(
  [...motionCss.matchAll(/@keyframes\s+(\w+)\s*(\{(?:[^{}]*\{[^{}]*\})*[^{}]*\})/g)].map((m) => [
    m[1] ?? '',
    m[2] ?? '',
  ]),
)

const anim = (name: string, spec: string): CSSProperties => ({ animation: `${name} ${spec}` })

interface Tile {
  name: string
  timing: string
  use: string
  loop?: boolean
  demo: ReactNode
}

const TILES: Tile[] = [
  {
    name: 'rise',
    timing: '0.5s spring, staggered 60ms',
    use: 'Cards and rows arriving on a screen',
    demo: (
      <div
        className="card"
        style={{ ...anim('rise', '.5s var(--spring) both'), padding: '12px 18px' }}
      >
        <b>Standings</b>
      </div>
    ),
  },
  {
    name: 'pop',
    timing: '0.35s spring',
    use: 'A pill or swatch being chosen; a round pip filling',
    demo: (
      <span className="pill on" style={anim('pop', '.35s var(--spring)')}>
        Rummy
      </span>
    ),
  },
  {
    name: 'badgeIn',
    timing: '0.7s spring',
    use: 'The header badge and the victory badge spinning in',
    demo: <Badge />,
  },
  {
    name: 'letterDrop',
    timing: '0.6s spring, 55ms per letter',
    use: 'The wordmark, one letter at a time',
    demo: <Wordmark />,
  },
  {
    name: 'crownDrop',
    timing: '0.7s spring',
    use: 'A new leader is crowned',
    demo: (
      <div style={{ paddingTop: 22 }}>
        <Chip name="Ana" color={0} size={56} crown />
      </div>
    ),
  },
  {
    name: 'bump',
    timing: '0.55s spring',
    use: "A player's card when their score changes",
    demo: (
      <div
        className="pcard"
        style={{ ...anim('bump', '.55s var(--spring)'), width: 110, paddingTop: 14 }}
      >
        <span className="pname">Ben</span>
        <span className="total">87</span>
      </div>
    ),
  },
  {
    name: 'deltaUp',
    timing: '1.5s spring',
    use: 'The "+12" that floats off a card',
    demo: (
      <div className="relative h-[70px] w-[120px]">
        <span className="delta" style={{ '--c': 'var(--jade)', top: 40 } as CSSProperties}>
          +12
        </span>
      </div>
    ),
  },
  {
    name: 'ribbon',
    timing: '1.35s cubic-bezier(.2,.9,.3,1)',
    use: 'Round banners sweeping across the screen',
    demo: (
      <div className="ribbon" style={{ fontSize: 30, padding: '6px 36px' }}>
        Round 3
      </div>
    ),
  },
  {
    name: 'sheetIn',
    timing: '0.5s spring',
    use: 'A sheet sliding up',
    demo: <MiniSheet style={anim('sheetIn', '.5s var(--spring) both')} />,
  },
  {
    name: 'sheetOut',
    timing: '0.28s cubic-bezier(.5,0,.75,0)',
    use: 'A sheet leaving (from wherever the finger let go)',
    demo: <MiniSheet style={anim('sheetOut', '.28s cubic-bezier(.5,0,.75,0) .7s both')} />,
  },
  {
    name: 'navInPush',
    timing: '0.42s glide',
    use: 'A page pushed in a sheet, arriving from the right',
    demo: <MiniPages enter="navInPush" exit="navOutPush" />,
  },
  {
    name: 'navOutPush',
    timing: '0.42s glide',
    use: 'The page beneath, stepping a little left',
    demo: <MiniPages enter="navInPush" exit="navOutPush" />,
  },
  {
    name: 'navInPop',
    timing: '0.42s glide',
    use: 'Back: the page beneath returning from the left',
    demo: <MiniPages enter="navInPop" exit="navOutPop" back />,
  },
  {
    name: 'navOutPop',
    timing: '0.42s glide',
    use: 'Back: the top page leaving to the right',
    demo: <MiniPages enter="navInPop" exit="navOutPop" back />,
  },
  {
    name: 'fadeIn',
    timing: '0.25s ease',
    use: 'The scrim behind a sheet; the victory veil',
    demo: <Scrim style={anim('fadeIn', '.6s ease both')} />,
  },
  {
    name: 'fadeOut',
    timing: '0.26s ease',
    use: 'The scrim leaving',
    demo: <Scrim style={anim('fadeOut', '.6s ease .5s forwards')} />,
  },
  {
    name: 'toastIn',
    timing: '0.45s spring',
    use: 'A toast popping up',
    demo: (
      <div className="relative h-[50px] w-full">
        <div
          className="toast in-flow"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            ...anim('toastIn', '.45s var(--spring) both'),
          }}
        >
          <Icon name="crown" size={18} />
          Ana takes the lead
        </div>
      </div>
    ),
  },
  {
    name: 'livePulse',
    timing: '1.4s, forever',
    use: 'The "In progress" dot; the current round pip',
    loop: true,
    demo: <span className="live-dot" style={{ width: 22, height: 22, margin: 0 }} />,
  },
  {
    name: 'matchGlow',
    timing: '1.6s ease-in-out, forever',
    use: 'A player at match point',
    loop: true,
    demo: <GlowCard name="matchGlow" tag="Match pt" />,
  },
  {
    name: 'dangerGlow',
    timing: '1.6s ease-in-out, forever',
    use: 'Near bust in a low-score-wins game',
    loop: true,
    demo: <GlowCard name="dangerGlow" tag="Danger" danger />,
  },
  {
    name: 'grow',
    timing: '0.9s spring, staggered 90ms',
    use: 'Standings bars filling',
    demo: (
      <div className="bar" style={{ width: 160 }}>
        <i style={{ '--c': 'var(--amber)', '--i': 0, width: '72%' } as CSSProperties} />
      </div>
    ),
  },
  {
    name: 'draw',
    timing: '1.4s ease-out, staggered 150ms',
    use: 'Lines on the wins chart',
    demo: (
      <svg className="chart" viewBox="0 0 160 70" style={{ width: 160 }} aria-hidden="true">
        <path
          className="ln"
          pathLength={1}
          d="M5 62 H45 V44 H85 V30 H120 V10 H155"
          stroke="var(--jade)"
          style={{ '--i': 0 } as CSSProperties}
        />
      </svg>
    ),
  },
  {
    name: 'rowIn',
    timing: '0.5s spring',
    use: 'The newest round dropping into the log',
    demo: (
      <div
        className="flex h-[40px] w-[180px] items-center justify-between rounded-[12px] px-3"
        style={anim('rowIn', '.5s var(--spring)')}
      >
        <span className="display text-faint">R4</span>
        <span className="display">12</span>
        <span className="display">30</span>
      </div>
    ),
  },
  {
    name: 'bob',
    timing: '3s ease-in-out, forever',
    use: 'The fox on an empty state',
    loop: true,
    demo: <Fox className="h-[80px] w-[80px]" />,
  },
  {
    name: 'spin',
    timing: '26s linear, forever (shown at 6s)',
    use: 'The sunburst behind the victory badge',
    loop: true,
    demo: (
      <div
        className="h-[96px] w-[96px] rounded-full"
        style={{
          background:
            'repeating-conic-gradient(rgb(var(--amber-rgb) / .35) 0 10deg, transparent 10deg 20deg)',
          ...anim('spin', '6s linear infinite'),
        }}
      />
    ),
  },
  {
    name: 'stamp',
    timing: '0.6s spring',
    use: "The winner's name slamming down",
    demo: (
      <span
        className="display text-[48px]"
        style={{
          color: 'var(--amber-display)',
          textShadow: 'var(--display-shadow)',
          ...anim('stamp', '.6s var(--spring) both'),
        }}
      >
        Ana!
      </span>
    ),
  },
  {
    name: 'wobble',
    timing: '0.9s ease-in-out ×2',
    use: 'Last place on the podium: "Next time"',
    demo: (
      <div className="pod" style={{ ...anim('wobble', '.9s ease-in-out 2'), width: 200 }}>
        <span className="place">4th</span>
        <span className="n">Dev</span>
        <span className="lbl">Next time</span>
      </div>
    ),
  },
  {
    name: 'shake',
    timing: '0.35s',
    use: 'An armed delete; an error message',
    demo: (
      <span className="btn btn-coral armed btn-sm">
        <Icon name="trash" size={18} />
        Tap again
      </span>
    ),
  },
  {
    name: 'flicker',
    timing: '2.2s ease-in-out, forever',
    use: 'The win-streak flame',
    loop: true,
    demo: (
      <span className="streak" style={{ marginTop: 0 }}>
        <Icon name="flame" size={16} />3 in a row
      </span>
    ),
  },
  {
    name: 'blink',
    timing: '4.6s, forever',
    use: 'The fox, always',
    loop: true,
    demo: <Fox className="h-[80px] w-[80px]" />,
  },
  {
    name: 'wink',
    timing: '0.7s ease',
    use: 'The victory fox',
    demo: <Fox wink crown className="h-[80px] w-[80px]" />,
  },
  {
    name: 'earTwitch',
    timing: '0.5s ease',
    use: 'The FAB fox after each scored round',
    demo: <Fox twitch className="h-[80px] w-[80px]" />,
  },
  {
    name: 'peelIn',
    timing: '0.5s spring, staggered',
    use: 'Stickers peeling onto the sticker book page',
    demo: (
      <Sticker
        tone="fox"
        icon="flame"
        shape="burst"
        size={64}
        style={anim('peelIn', '1.2s var(--spring) infinite')}
      />
    ),
  },
  {
    name: 'slapIn',
    timing: '0.5s spring',
    use: 'Each sticker slapping down out of the victory pack',
    demo: (
      <Sticker
        tone="coral"
        icon="camera"
        shape="circle"
        size={64}
        style={anim('slapIn', '1.2s var(--spring) infinite')}
      />
    ),
  },
  {
    name: 'packIdle',
    timing: '3.2s ease-in-out, forever',
    use: 'The sealed sticker pack swaying, to invite the tap',
    loop: true,
    demo: (
      <div
        className="h-[80px] w-[64px] rounded-[10px]"
        style={{
          background:
            'linear-gradient(115deg, var(--lav), var(--coral) 40%, var(--amber) 70%, var(--jade))',
          ...anim('packIdle', '3.2s ease-in-out infinite'),
        }}
      />
    ),
  },
  {
    name: 'foil',
    timing: '5s linear, forever',
    use: 'The shine sliding across the sticker pack',
    loop: true,
    demo: (
      <div
        className="h-[80px] w-[120px] rounded-[14px]"
        style={{
          background:
            'linear-gradient(115deg, var(--lav), var(--coral) 40%, var(--amber) 70%, var(--jade))',
          backgroundSize: '220% 220%',
          ...anim('foil', '5s linear infinite'),
        }}
      />
    ),
  },
  {
    name: 'themeReveal',
    timing: '0.7s ease-in-out',
    use: 'Changing the theme: the next one grows out of the button you tapped',
    loop: true,
    demo: (
      <div className="relative h-[80px] w-[120px] overflow-hidden rounded-[14px] border-[1.5px] border-line">
        <div className="absolute inset-0" data-theme="dark" style={{ background: 'var(--page)' }} />
        <div
          className="absolute inset-0"
          data-theme="light"
          style={
            {
              background: 'var(--page)',
              '--reveal-x': '24px',
              '--reveal-y': '58px',
              '--reveal-r': '130px',
              ...anim('themeReveal', '1.4s var(--glide) infinite'),
            } as CSSProperties
          }
        />
      </div>
    ),
  },
]

function MiniSheet({ style }: { style: CSSProperties }) {
  return (
    <div className="relative h-[100px] w-[150px] overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 h-[78px] rounded-t-[20px] border-[1.5px] border-line border-b-0 bg-sunk"
        style={style}
      >
        <div className="mx-auto mt-2 h-[5px] w-[34px] rounded-[3px] bg-line" />
      </div>
    </div>
  )
}

/** Two pages in a tiny sheet: one slides in over (or out from over) the other. */
function MiniPages({ enter, exit, back }: { enter: string; exit: string; back?: boolean }) {
  const spec = '.42s var(--glide) .4s both'
  const page = 'absolute inset-0 grid place-items-center bg-sunk text-[13px] font-black'
  return (
    <div className="relative h-[90px] w-[150px] overflow-hidden rounded-[14px] border-[1.5px] border-line">
      <div className={page} style={anim(back ? enter : exit, spec)}>
        Players
      </div>
      <div
        className={page}
        style={{ ...anim(back ? exit : enter, spec), boxShadow: '-1px 0 0 var(--line)' }}
      >
        Edit Kate
      </div>
    </div>
  )
}

function Scrim({ style }: { style: CSSProperties }) {
  return (
    <div className="relative grid h-[90px] w-[150px] place-items-center overflow-hidden rounded-[14px] bg-surface">
      <b>Card</b>
      <div className="absolute inset-0" style={{ background: 'var(--scrim)', ...style }} />
    </div>
  )
}

function GlowCard({ name, tag, danger }: { name: string; tag: string; danger?: boolean }) {
  return (
    <div
      className="pcard"
      style={{ ...anim(name, '1.6s ease-in-out infinite'), width: 110, paddingTop: 22 }}
    >
      <span className={danger ? 'tag danger' : 'tag'}>{tag}</span>
      <span className="pname">Cleo</span>
      <span className="total">{danger ? 94 : 182}</span>
    </div>
  )
}

function MotionTile({ tile }: { tile: Tile }) {
  const [k, setK] = useState(0)
  const [showSrc, setShowSrc] = useState(false)
  return (
    <div className="card flex flex-col gap-3" style={{ padding: 14 }}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <b className="display text-[22px]">{tile.name}</b>
            {tile.loop && <Tag tone="lav">loop</Tag>}
          </div>
          <Mono className="text-muted">{tile.timing}</Mono>
        </div>
        <IconButton
          icon="repeat"
          label={`Replay ${tile.name}`}
          onClick={() => setK((x) => x + 1)}
        />
      </div>
      <div className="grid h-[132px] place-items-center overflow-hidden rounded-[14px] border-[1.5px] border-line bg-sunk">
        <div key={k} className="grid place-items-center">
          {tile.demo}
        </div>
      </div>
      <span className="text-[13px] text-muted">{tile.use}</span>
      <button
        type="button"
        className="link self-start"
        style={{ minHeight: 32, fontSize: 12.5 }}
        aria-expanded={showSrc}
        onClick={() => setShowSrc((s) => !s)}
      >
        {showSrc ? 'Hide keyframes' : 'Show keyframes'}
      </button>
      {showSrc && (
        <pre className="m-0 overflow-x-auto whitespace-pre-wrap rounded-[10px] bg-sunk p-2 text-[11px] text-muted">
          <Mono>{(SOURCE[tile.name] ?? '').replace(/\}/g, '}\n').replace(/\{/g, ' {').trim()}</Mono>
        </pre>
      )}
    </div>
  )
}

/** Sample a CSS cubic-bezier(x1, y1, x2, y2) into SVG points (x right, y up). */
function bezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  h: number,
  pad: number,
) {
  const pts: string[] = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const u = 1 - t
    const x = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3
    const y = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3
    pts.push(`${(pad + x * w).toFixed(1)},${(pad + (1 - y) * h).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
}

const CURVES = [
  {
    name: '--spring',
    css: 'cubic-bezier(.25, 1.45, .45, 1)',
    p: [0.25, 1.45, 0.45, 1],
    tone: 'jade',
    use: 'Almost everything: it overshoots ~10% and settles.',
  },
  {
    name: 'sheet out',
    css: 'cubic-bezier(.5, 0, .75, 0)',
    p: [0.5, 0, 0.75, 0],
    tone: 'coral',
    use: 'Leaving: accelerates away, no bounce.',
  },
  {
    name: '--glide',
    css: 'cubic-bezier(.32, .72, 0, 1)',
    p: [0.32, 0.72, 0, 1],
    tone: 'lav',
    use: 'A page pushed in a sheet: quick, long settle, no overshoot at the edge.',
  },
  {
    name: 'ribbon',
    css: 'cubic-bezier(.2, .9, .3, 1)',
    p: [0.2, 0.9, 0.3, 1],
    tone: 'amber',
    use: 'The banner: fast in, long hang.',
  },
] as const

function SpringCurve() {
  const [k, setK] = useState(0)
  const W = 300
  const H = 170
  const pad = 30
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <div className="card">
        <svg
          viewBox={`0 0 ${W + pad * 2} ${H + pad * 2}`}
          className="w-full"
          role="img"
          aria-label="Easing curves"
        >
          <rect
            x={pad}
            y={pad}
            width={W}
            height={H}
            fill="none"
            stroke="var(--line)"
            strokeDasharray="4 6"
          />
          <line x1={pad} x2={pad + W} y1={pad} y2={pad} stroke="var(--faint)" strokeWidth={1} />
          <text x={pad + W + 4} y={pad + 4} fill="var(--faint)" fontSize="11" fontWeight={900}>
            1
          </text>
          {CURVES.map((c) => (
            <path
              key={c.name}
              d={bezierPath(c.p[0], c.p[1], c.p[2], c.p[3], W, H, pad)}
              fill="none"
              stroke={`var(--${c.tone})`}
              strokeWidth={c.name === '--spring' ? 4.5 : 2.5}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="mt-2 flex flex-col gap-2">
          {CURVES.map((c) => (
            <div key={c.name} className="flex items-baseline gap-2">
              <span
                className="inline-block h-[10px] w-[18px] rounded-[5px]"
                style={{ background: `var(--${c.tone})` }}
              />
              <b>{c.name}</b>
              <Mono className="text-muted">{c.css}</Mono>
            </div>
          ))}
        </div>
      </div>
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <b className="display text-[22px]">Feel the difference</b>
          <IconButton icon="repeat" label="Replay the race" onClick={() => setK((x) => x + 1)} />
        </div>
        {CURVES.map((c) => (
          <div key={c.name} className="flex flex-col gap-1">
            <span className="text-[12.5px] text-muted">{c.use}</span>
            <div className="relative h-[40px] rounded-[20px] bg-sunk">
              <span
                key={k}
                className="absolute top-[4px] left-[4px] grid h-[32px] w-[32px] place-items-center rounded-full"
                style={
                  {
                    background: `var(--${c.tone})`,
                    animation: `slide-${c.tone} 1.1s ${c.css.replace(/\s/g, '')} .2s both`,
                  } as CSSProperties
                }
              />
            </div>
          </div>
        ))}
        <style>
          {CURVES.map(
            (c) => `@keyframes slide-${c.tone}{from{left:4px}to{left:calc(100% - 36px)}}`,
          ).join('')}
        </style>
      </div>
    </div>
  )
}

export const Motion: Story = {
  render: (_, { globals }) => (
    <Page
      theme={pageTheme(globals)}
      title="Motion"
      lede={
        <>
          Things in Tally Ho! <b>land</b>: they drop, bump, stamp and settle on one springy curve.
          Every keyframe in <Mono>motion.css</Mono> is below: the prototypes' verbatim, plus a few
          of our own (the theme reveal, pages pushing in a sheet). Hit{' '}
          <Icon name="repeat" size={16} className="inline align-[-3px]" /> on any tile to play it
          again. With <Mono>prefers-reduced-motion</Mono> on, one block in that file stills them all
          — that is the only kill switch, so never animate around it.
        </>
      }
    >
      <Section
        title="The spring"
        note="One curve does nearly all the work. It overshoots and settles like a chip dropped on felt."
      >
        <SpringCurve />
      </Section>
      <Section
        title="Keyframes"
        note={`${TILES.length} named animations. Durations are what the components use.`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <MotionTile key={t.name} tile={t} />
          ))}
        </div>
      </Section>
    </Page>
  ),
}
