# Tally Ho! Mixtape Feature Spec

Oct 20, 2026 · @Blair

Mixtape turns every finished game into a short song built from its scores, then keeps those songs on a replayable shelf. It needs no new score data: the song is derived from rounds the app already stores.

## What it is

Each round of a game adds one note to that game's song, played in the color and pitch of the round's top scorer. When the game ends, the finished song is "pressed" into the Mixtape: a shelf of every game the family has played, each one replayable in a few seconds.

The core rule: **the song is a pure function of the game's rounds.** The same scores always produce the same tune, so a song never needs to be saved separately. If someone edits a round, the song changes with it.

Three things the feature adds:

- **The song so far:** a live melody on the in-game screen that grows one note per round.
- **The winner's playback:** the full song plays once on the victory screen, ending on a chord in the winner's note.
- **The Mixtape shelf:** a horizontal row of recent games on Home, each with a play button and a mini staff.

## How a song is composed

Every song is written in a key over a looping chord progression, and every melody note is a chord tone of the chord playing on that beat. That is why the songs sound like music rather than a readout: the harmony is decided before a single score is read, and the scores only choose which chord tones to play and when to add a lick.

**Step 1: the game picks the key and the loop.** Both come from a hash of the game's name, so every Flip 7 game is in the same key with the same four-chord loop. The family learns to recognize it.

| Element | Chosen from | Example |
| --- | --- | --- |
| Key | 12 major keys | Flip 7 is in G, Sushi Go is in D |
| Chord loop | Four familiar pop loops, one chord per beat, repeating | I–V–vi–IV, I–vi–IV–V, vi–IV–I–V, I–IV–vi–V |
| Tempo | One fixed tempo, about 120 bpm | A 7-round game runs 7 beats, under 4 s with the intro and tag |

**Step 2: each round plays a chord tone.** One round equals one beat, and the beat's chord comes from the loop.

| Input | Becomes | Rule |
| --- | --- | --- |
| Round's top scorer | Which chord tone | Each player owns a voice: root, third or fifth, from their color index. A player always sings the same part of the chord |
| Round score | Octave and extension | 0–11: the voice in the low octave. 12–35: middle octave. 36–59: high octave. 60+: high octave plus the chord's ninth as a grace note |
| Tie for top | Two or three chord tones together | Always consonant because every voice is in the chord |
| Nobody scored | Rest, with the bass still playing | The loop keeps time, so a rest reads as a held breath |
| Bass | Chord root, one per beat | Carries the progression under every song |

**Step 3: licks mark the moments.** A lick is a short run of two to four notes built from the chord and the scale, inserted around a beat as a pickup or a tail. Licks are what make a song hummable, and because they only use diatonic notes they can never clash.

| Moment | Lick | Shape |
| --- | --- | --- |
| Game starts | The game's riff | A two-bar hook, 6 to 8 notes, generated once from the game name and reused in every game of that type. Arpeggiates the first two chords of the loop with one passing tone |
| Lead change | Turnaround | Scale step below the new leader's chord tone, then up to it: a rising "here I come" |
| Three round wins in a row | Hammer | The player's chord tone three times fast, then the octave |
| Bust (0 while others score) | Slide down | Chord tone, then two scale steps down, landing on the next chord's root |
| Match point | Suspension | Hold the fourth over the chord, resolve to the third on the next beat |
| Game ends | Winner's tag | V to I cadence, then a three-note signature on the winner's voice: fifth, third, root. Every win by Kate ends with Kate's tag |

Hooks are deterministic: the same game name gives the same riff, and the same player gives the same tag. Nothing is random at playback, so a song replays note for note.

The melody instrument and bass timbre are design hooks (see Design hooks). Keep the register narrow, about two octaves, so licks stay singable.

## Data and storage

Songs are computed, not stored. The app already keeps every game and its rounds on the device; Mixtape reads that record and composes on demand. The only new stored data is two small optional fields for engagement.

| Data | Stored? | Where | Notes |
| --- | --- | --- | --- |
| Game, players, rounds, scores, winner | Already stored | Existing game record on the device | Source of truth for every song |
| Player color index | Already stored | Existing player color map | Sets each player's base pitch, so it must stay stable once assigned |
| The song (notes, chord, bass) | No | Derived at render and playback time | Recomputed from rounds; edits change the song automatically |
| `plays` per game | New, optional | On the game record | Count of times the song was played; drives "most played" |
| `favorite` per game | New, optional | On the game record | Pinned songs sort first on the shelf |
| Key, chord loop, game riff | No | Derived from a hash of the game name | Same name, same key, loop and riff, so every Flip 7 sounds like Flip 7 |
| Player voice and tag | No | Derived from the player's color index | Root, third or fifth; the tag is that voice's three-note cadence |

Derived shape, for reference:

```
keyOf(gameName)      -> { tonic: "G", loop: ["I","V","vi","IV"] }
riffOf(gameName)     -> [ { beat: -2, degree: 1 }, { beat: -1.5, degree: 3 }, ... ]   // intro hook
voiceOf(colorIndex)  -> "root" | "third" | "fifth"

songOf(game) -> {
  key, riff,
  beats: [
    { beat: 0, chord: "I",  tones: [{ player: "Blair", voice: "third", octave: 1 }], lick: null },
    { beat: 1, chord: "V",  tones: [], lick: null },                      // rest
    { beat: 2, chord: "vi", tones: [{ player: "Kate", voice: "root", octave: 2 }], lick: "turnaround" },
    ...
  ],
  tag: { player: "Kate", voice: "root" }                                  // winner's cadence
}
```

Keep it local-first, like the rest of the app: no audio files, no server, no sync. A song costs nothing to keep, so the Mixtape grows with no storage limit beyond the games themselves.

## Where it lives

Mixtape shows up on five surfaces. Two are on main screens, and three are inside existing bottom sheets, so it needs no new navigation.

| Surface | Placement | What it shows | Actions |
| --- | --- | --- | --- |
| Home: Mixtape shelf | Below the standings, above recent games | Horizontal scroll of the last 6 games as song cards, favorites first | Play/stop on each card; tap the card to open the game detail sheet |
| Game screen: The song so far | Top card, above the player totals | Staff with one note per round; the newest note drops in after each submit | Tap the staff to hear the song so far |
| Edit round sheet | Under the score fields | Preview staff with the edited round highlighted | Hear the new note before saving |
| Victory overlay | Between the winner's name and the podium | Full staff that plays on its own once, with a playhead lighting each note | Replay |
| Game detail sheet (history) | Under the title and date | Staff, play button, play count | Play/stop; favorite |

**Song card anatomy (Home shelf):**

1. Cover art in the winner's color, with the game name
2. A spinning disc or similar motif while it plays
3. A mini staff that scales to fit any number of rounds
4. Winner, date and round count
5. A play/stop button, at least 44 px

**The song so far (game screen):** caption it "Each round adds a note in the round winner's color" until the first round is scored, then show the staff alone. Scroll it sideways past about 14 rounds.

**Bottom sheets:** reuse the app's existing sheet component. Mixtape adds a section to the edit round and game detail sheets; it never opens a sheet of its own.

## Behavior and states

| State | Trigger | Behavior |
| --- | --- | --- |
| Idle | Default | Static staff, play icon |
| Playing | Tap play | Notes light in sequence with a playhead; icon becomes stop; `plays` +1 |
| One at a time | Play a second song | The first stops, and its card returns to idle |
| Stopped | Tap stop, leave the screen, or open a sheet | Visuals reset; already-scheduled notes may ring out |
| Round added | Submit a round | New note drops onto the staff and plays alone, about 0.4 s |
| Round edited or deleted | Save in the edit sheet | Staff recomposes; the changed note pulses once |
| Game finished | Winner decided | Song plays once on the victory overlay, then the game joins the shelf |
| Muted | Global sound off | Playhead still animates silently; the play button stays enabled |
| No games yet | Empty history | Shelf replaced by one line: "Finish a game to press your first song" |
| No rounds yet | New game | The song card shows its caption, not an empty staff |
| Reduced motion | OS setting | No drop-in or spin; playback highlight still steps through notes |

Audio starts only from a tap. Browsers block sound before the first user gesture, and the victory playback always follows the tap that scored the last round.

## Design hooks

These are named slots, not values. Map each one to the local design system's tokens, motion curves and voice.

| Slot | Used for | Map to |
| --- | --- | --- |
| `player.color[n]` | Note heads, cover art, the play button | Existing per-player color token |
| `surface.card` | Song card and staff background | Card or raised surface token |
| `ink.staff` | Staff lines (low opacity), stems | Primary text color |
| `ink.muted` | Rests, metadata, empty-state copy | Secondary text color |
| `accent.active` | Playhead and the active note's glow | Accent or focus color |
| `type.display` | Game name on cover art | Display face |
| `type.meta` | Date, rounds, play count | Caption or mono face |
| `radius.card`, `radius.control` | Card corners, play button | Existing radius scale |
| `motion.spring` | Note drop-in, card press | Existing bouncy easing |
| `motion.step` | Playhead advance, one per beat | Linear or stepped timing, matched to beat length |
| `motion.ambient` | Disc spin while playing | Slow loop, off under reduced motion |
| `sound.timbre` | Melody instrument | Plucked string by default; swap for the app's own palette (chip, marimba, bell). Licks use the same timbre, a little quieter |
| `sound.bass` | Bass line | Same family as the timbre, an octave or two down |
| `copy.voice` | Labels like "Mixtape", "The song so far", empty states | Local tone; rename freely |

Motion moments to keep, whatever the styling:

1. **Drop-in:** a new note falls onto the staff and settles, about 0.5 s.
2. **Playhead:** each note scales up and glows on its beat, then settles back.
3. **Press:** the finished song moves from the victory screen to the first slot on the shelf the next time Home opens.

## Why it is gamified and sticky

Mixtape gives every game a keepsake. Scores are forgotten by the next morning; a tune you can replay is not. It adds a reason to finish a game, a reason to open the app between game nights, and a shared object the family talks about.

| Mechanic | How Mixtape uses it | What it drives |
| --- | --- | --- |
| Variable reward | No two games sound alike, and you can't predict the song until the last round | Curiosity to finish and hear it |
| Collection | Every finished game adds a card to the shelf | Momentum: "one more for the Mixtape" |
| Identity | Each player owns a chord voice and a three-note tag, so a win ends on your signature | Pride; kids learn "their" sound |
| Live feedback | The song grows audibly each round | Each submit feels like a small reward, not data entry |
| Story recall | Lead changes get a turnaround lick and busts slide down, so the licks retell the game | "Play the one where Alder came back" |
| Sharing ritual | Replay at the table, at dinner, the next day | Return visits outside game night |
| Light status | Play counts and favorites surface the family's classics | A reason to revisit old games |
| Earworm | Every game type opens with the same riff, in the same key | Hearing the Flip 7 riff means game night; people hum it and ask to play |

Two guardrails keep it delightful rather than naggy: songs are short (under 5 seconds), and nothing ever plays without a tap. The losing player still gets a moment, because their notes are part of the song too.

## Acceptance criteria

- [ ] The same rounds always produce the same song, across sessions and devices
- [ ] Editing or deleting a round updates the staff and playback right away
- [ ] Ties play a chord; rounds where no one scored play a rest
- [ ] Only one song plays at a time, from anywhere in the app
- [ ] No audio before a user tap; global mute is respected
- [ ] The Home shelf shows the last 6 games, favorites first, and scrolls sideways
- [ ] The staff fits 1 to 20 rounds without overflowing the page
- [ ] Reduced motion removes the drop-in and spin but keeps the playhead
- [ ] Play buttons are at least 44 px and labeled "Play \[game\] song" / "Stop \[game\] song"
- [ ] Every melody and lick note is diatonic to the game's key, and every beat note is a tone of that beat's chord
- [ ] The same game name always yields the same key, loop and riff; the same player always gets the same voice and tag
- [ ] A lick fires only on its moment, and never more than one lick per beat

## Open questions

- Should players be able to pick their own chord voice or instrument, or is the color index enough?
- Should the shelf get a "Play all" that runs the last 6 games as one track?
- Should the song export as a short audio file to share outside the app? That would add the first stored media.
- Should a custom game let the family pick its key and loop from a short list, or should it stay hashed from the name?
- Minor keys for low-score-wins games (Hearts, Rummy)? It would make the "lower is better" games sound different on purpose.
