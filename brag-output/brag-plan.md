# Brag Plan: Shahzad's Halal Food

## What is this app?
The site and ordering platform for a 24/7-adjacent halal joint on Easton Ave in
New Brunswick — chicken and lamb over brown basmati, gyros, cheesesteaks, six
house sauces, open until 3 AM every night of the week.

## The angle
This isn't a parody product, so it doesn't get parody treatment. The angle is
**the light that's still on at 1:47 AM**. Everything around the Rutgers College
Ave campus is shut; this flat-top is not. The site already knows this about
itself — its own copy says "Hungry at 1:47 AM? Same." The video takes that line
seriously and builds the whole piece around the hour.

What makes it specific: every pixel is the real thing. The real palette (ember
black, flat-top red, gold), the real self-hosted fonts, the real food photos,
the real menu names, the real six sauces with their real hex colors, and the
real 24-hour hours dial that the homepage renders live.

## Hook (first 2-3 seconds)
A clock reading **1:47 AM** in the site's own condensed display face, embers
drifting behind it, then one line: **"Everything else is closed."** The hour is
the hook — it's the single most interesting fact about this restaurant.

## Key moments (the middle)
- The hero headline landing line by line the way the site animates it:
  **STACKED. SAUCED. 100% HALAL.** — with the spinning plate of combo-over-rice.
- The menu filtering for real: the category tabs, a cursor tapping **Gyros**,
  and three real gyro cards sliding in one by one with their actual photos and
  actual descriptions.
- The six house sauces arriving as swatches in their real hex colors under the
  site's own line: **"Six sauces. Zero rules."**
- The hours dial drawing its gradient arc from 10 AM around to 3 AM.

## Outro / punchline
The dial finishes, the line lands — **"Open till 3 AM. Every night."** — then the
logo lockup with the address and the one thing the platform is for:
**Order ahead. Pick up. Skip the line.**

## User flow worth showing
The shipped product's real interaction is menu browsing: **land on the menu →
tap a category tab → the grid filters to that category → pick a sauce**. Scene 3
simulates the tab tap with a cursor and shows the filtered cards arriving; scene
4 shows the sauce picker switching. Both are real behaviour in the shipped
homepage, not mockups of a future feature.

Deliberately NOT shown: cart, checkout, payment, or the manager order board.
Those are phases 3-5 and do not exist yet. Nothing in this video claims them.

## Tone
- Preset: `default`
- Creative direction: late-night flat-top energy — the sign that's still lit
  when everything else on the block is dark.
- Interpretation: warm, confident, unhurried enough to read, with the heat
  coming from the palette and the food photography rather than from shouting.
  Mixed case, no ALL-CAPS hype except where the site itself shouts. Five scenes,
  each given room to land.

## Format: landscape — 1920x1080
## Duration: 21.5 seconds

Final scene boundaries as rendered: 0 → 3.5 → 7.6 → 12.5 → 16.5 → 21.5.

## Visual identity (from the project)
- Background: `#0d0907` (`--bg`), with `#150f0b` (`--bg-2`) and `#1b140f` (`--card`)
- Accent: `#e23a2f` (`--red`), `#ff5a3c` (`--red-2`), `#f5b53d` (`--gold`)
- Text: `#f6ecdc` (`--cream`), muted `#b3a393`
- Open-state green: `#8bbf5a` (`--herb`)
- Display font: Big Shoulders Display 800/900 (self-hosted woff2)
- Body font: DM Sans 400/500/700 (self-hosted woff2)
- Accent italic: Fraunces 700 italic (self-hosted woff2) — the site's `<em>` face
- Strongest visual elements: the ember field, the conic-gradient plate with
  orbiting food photos, the food card grid, the six sauce colors, the 24-hour
  dial with its gold→red arc

Contrast note: cream on red (`#f6ecdc` on `#e23a2f`) is around 3.9:1, which fails
WCAG AA for normal text. Any text on red must be large display weight, or use
the site's own dark ink (`#1b140f`) on gold/red chips.

## Share copy (draft)
Built the site for Shahzad's Halal Food on Easton Ave — the flat-top that's still
going at 3 AM. Real menu, real sauces, real hours dial.

## Audio direction
- Role: warm upbeat bed with a small, motion-matched SFX layer.
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120.19 BPM).
- Music treatment: start at 0, volume 0.32, fade in 0.6s, fade out over the last
  1.2s under the logo so the final accent rings.
- Music cue guidance: bundled preset read at
  `assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`.
  Beat grid is every ~0.5s from 3.02s. Strong cues in-window start at 16.02s:
  **17.02, 18.52, 20.02** are the three locked in the final cut — hours line,
  "Every night.", and the logo lockup. Sequential reveals use the grid: the tab
  tap at 8.02 and the menu cards at 9.02 / 10.02 / 11.02 (every other beat, so
  each dish name holds a full second), sauce swatches at 13.01 → 15.52 (every
  beat; they accumulate and hold as a set until 16.5).
- Audio-reactive treatment: subtle; use RMS/bass to make the ember glow and the
  hero plate's warmth breathe. No waveform, equalizer or particle-visualizer
  graphics.
- SFX posture: moderate (5-7 cues), motion-matched.
- Audio-coupled moments: the cursor tap on the Gyros tab, each menu card
  landing, the sauce swatches, the dial arc completing, the logo lockup.
- Restraint rule: no SFX on individual letters, no sound on the muted body copy,
  nothing that fights the music's downbeat. The food photography carries the
  scene; sound only marks arrival.

## Storyboard

### Scene 1 — 1:47 AM — 3.5s
Near-black ember field. `1:47 AM` in Big Shoulders 900 at huge scale, cream,
slams in at 0.25s and holds. At 1.35s, one line of DM Sans in muted cream below:
`Everything else is closed.` Both hold to the cut. A red radial glow breathes
behind the type.
Sequential/interaction: none.
Audio intent: the bed enters warm and low; one soft impact marks the clock.
Audio-coupled idea: single soft impact on the clock landing.
Music: upbeat bed, faded in.
Transition mood: clean → Scene 2

### Scene 2 — The flat-top — 4.1s
The site's hero, rebuilt. Left: the headline rising line by line exactly as the
homepage does it — `Stacked.` / `Sauced.` / `100% Halal.` (the third in Fraunces
italic red, as on the site). Above it the eyebrow `Easton Ave · New Brunswick`,
below it the green `Open now` status pill. Right: the combo-over-rice plate in
its conic-gradient ring, slowly rotating, with the ember glow behind.
Sequential/interaction: yes — three headline lines rise one after another, 0.35s
apart, each fully settled before the next.
Audio intent: the bed opens up; the plate arrives with warmth, not impact.
Audio-coupled idea: soft drop per headline line; nothing on the plate.
Transition mood: clean → Scene 3

### Scene 3 — The menu, filtering — 4.9s
An eyebrow reads `14 items · every one halal`. The real category tab row: `All 14` · `Platters 4` · `Gyros 4` · `Cheesesteaks 2`
· `Burgers & Sides 4`. A cursor moves to `Gyros` and clicks at ~8.0s; the tab
flips to the cream active state. Three real cards then slide up one by one —
**Combo Gyro**, **Lamb Gyro**, **Falafel Gyro** — each with its real photo, its
`Halal` tag and its real one-line description.
Sequential/interaction: yes — simulated cursor tap on the Gyros tab, then three
cards arriving on the beat grid at 9.02 / 10.02 / 11.02, one per card, each name
holding a full second before the next.
Audio intent: the click is the only "interface" sound in the video; cards land
like plates on a counter.
Audio-coupled idea: mouse click on the tab; a card-place sound per card.
Transition mood: clean → Scene 4

### Scene 4 — Six sauces. Zero rules. — 4.0s
The site's own line in display caps with `Zero rules.` in Fraunces italic gold.
Six sauce swatches pop in as rounded drips in their real hex colors — White
`#f3eee2`, Hot `#d8321f`, Green `#7eae47`, Tahini `#d8b07a`, BBQ `#6e2716`,
Buffalo `#e8762a` — each labelled. The morphing blob behind shifts to the last
selected sauce's color.
Sequential/interaction: yes — six swatches on consecutive beats 13.01 → 15.52,
accumulating and holding as a complete set until the cut at 16.5s.
Audio intent: light, quick, additive — a little rhythm without clutter.
Audio-coupled idea: a soft drop on the first, third and sixth swatch only, not
all six.
Transition mood: clean → Scene 5

### Scene 5 — Open till 3 AM + lockup — 5.0s
The 24-hour dial draws its gold→red arc from 10 AM around past midnight to 3 AM,
with the live dot parked at 1:47 AM — the hour the video opened on — and the
`Open now` pill in the middle. Line at 17.02s: `Open till 3 AM.` Second line at
18.52s: `Every night.` At 20.02s the dial and
type clear and the logo lockup lands: the real logo mark, `Shahzad's` in display
caps with `Halal Food` in gold letter-spaced small caps, then
`152 Easton Ave · New Brunswick, NJ` and the closing line
`Order ahead. Pick up. Skip the line.`
Sequential/interaction: yes — the arc draws over ~1.2s, then two lines land on
strong cues, then the lockup.
Audio intent: the two lines land on the music's strongest hits; a single bell
marks the logo and rings as the bed fades.
Audio-coupled idea: arc completion tick, then one bell on the lockup.
Transition mood: final hold to black.

**Music mood for this video:** upbeat
**Audio summary:** A warm bed fades in under the 1:47 AM clock, opens up through
the hero and the menu where a single click and three plate-like card sounds do
all the work, stays light under the sauces, then lands its two biggest lines and
the logo on the track's three strongest beats before fading out under a ringing
bell.
