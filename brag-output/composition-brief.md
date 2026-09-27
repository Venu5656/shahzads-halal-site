# Hyperframes Composition Brief: Shahzad's Halal Food

## Objective
Create a short launch-style brag video for Shahzad's Halal Food — the late-night
halal restaurant on Easton Ave whose site and ordering platform this repo is.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21.5 seconds

## Source Material
- Project root: `/Users/venusikhakolli/Downloads/shahzads-halal-site`
- Primary files read: `src/app/page.tsx` (ported homepage markup),
  `src/app/globals.css` (the original stylesheet, verbatim),
  `src/lib/menu-data.ts` (the 14 items and 6 sauces),
  `src/lib/hours.ts` (opening hours), `legacy/index.html`, `README.md`
- Product name: Shahzad's Halal Food
- Tagline / strongest claim: "Hungry at 1:47 AM? Same." — open until 3 AM, seven
  nights a week, everything halal.
- Key UI or visual moments to recreate: the hero headline rise, the category tab
  row with the real counts, the food card grid, the six sauce swatches, the
  24-hour hours dial.
- Copy that must appear verbatim:
  - `Stacked.` / `Sauced.` / `100% Halal.`
  - `Easton Ave · New Brunswick`
  - `Open now`
  - `Combo Gyro`, `Lamb Gyro`, `Falafel Gyro` (+ their real descriptions)
  - `Six sauces.` / `Zero rules.`
  - `White Sauce`, `Hot Sauce`, `Green Sauce`, `Tahini`, `BBQ`, `Buffalo`
  - `152 Easton Ave · New Brunswick, NJ`
- Real assets to use (copy into `composition/assets/`):
  - Photos from `public/img/`: `combo-rice.webp`, `combo-gyro.webp`,
    `lamb-gyro.webp`, `falafel-wrap.webp`, `philly.webp`, `falafel4.webp`,
    `logo.png`
  - Self-hosted fonts from `public/fonts/`: Big Shoulders Display 800 + 900,
    DM Sans 400 + 500 + 700, Fraunces 700 italic

## Creative Direction
- Tone preset: `default`
- Creative direction: late-night flat-top energy — the sign still lit when the
  rest of the block is dark.
- Interpretation: warm and confident, never shouty. Heat comes from the palette
  and the food photography. Mixed case except where the site itself uses display
  caps. Five scenes, each with room to land.
- Angle: the hour is the story. Everything around the Rutgers College Ave campus
  is closed at 1:47 AM and this flat-top is not — the site's own copy already
  says so. Build the piece around that hour, using only real palette, real fonts,
  real photos, real menu names, real sauce colors and the real hours dial.
- Hook: a `1:47 AM` clock in the site's condensed display face over drifting
  embers, then `Everything else is closed.`
- Outro / punchline: `Open till 3 AM. Every night.` → logo lockup →
  `Order ahead. Pick up. Skip the line.`
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign — this is the restaurant's existing brand
  - Any claim about cart, checkout, payment or the manager board (not built yet)

## Visual Identity
- Background: `#0d0907`; panels `#150f0b`, cards `#1b140f`; hairline
  `rgba(246,236,220,.10)`
- Text: `#f6ecdc` (cream), muted `#b3a393`
- Accent: `#e23a2f` (red), `#ff5a3c` (red-2), `#f5b53d` (gold), `#8bbf5a` (open green)
- Display font: Big Shoulders Display (800/900), uppercase, tight leading (~0.88)
- Body font: DM Sans (400/500/700)
- Accent italic: Fraunces 700 italic — the site's `<em>` treatment, used for
  `100% Halal.` (red) and `Zero rules.` (gold)
- Visual references from the project: ember canvas field, the conic-gradient
  plate ring with orbiting food photos, rounded pill buttons and tabs, the
  `Halal` tag chip, the 24-hour dial with a gold→red gradient arc
- **Contrast**: cream on red is ~3.9:1 and fails WCAG AA at normal size. Put
  cream on the dark backgrounds; on red or gold fills use the site's dark ink
  `#1b140f`, or keep the text large display weight.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. `1:47 AM` — 3.5s — the clock, then `Everything else is closed.`
2. The flat-top — 4.1s — hero headline rising line by line + the plate
3. The menu, filtering — 4.9s — cursor taps `Gyros`, three real cards arrive
4. Six sauces. Zero rules. — 3.5s — six real-colored swatches accumulate
5. Open till 3 AM + lockup — 5.5s — dial arc draws, two lines land, logo lockup

## Audio
- Audio role: warm bed with a small, motion-matched SFX layer.
- Audio arc: low and warm under the clock → opens through hero and menu → light
  under the sauces → strongest hits on the closing lines → fades under a ringing
  bell on the lockup.
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120.19 BPM)
- Music treatment: `data-volume="0.32"`, fade in 0.6s, fade out 1.2s at the end.
- Music cue guidance: bundled preset at
  `~/.claude/skills/brag/assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`
  (copy the JSON next to the track). Beat grid every ~0.5s from 3.02s.
  **Lock these three strong cues**: `16.02` (`Open till 3 AM.`), `18.02`
  (`Every night.`), `20.02` (logo lockup). **Beat-grid** the menu cards at
  `8.02 / 9.02 / 10.02` (every other beat, so each card name is readable) and the
  six sauce swatches at `13.01 / 13.51 / 14.02 / 14.52 / 15.02 / 15.52` (every
  beat; they accumulate and hold as a set until the scene cuts).
- Audio-reactive treatment: subtle — drive the ember glow and the hero plate's
  warm halo from RMS/bass. No waveform, equalizer, notes or particle visualizers,
  no text scaling.
- Audio-coupled moments:
  - Scene 1 clock landing — one soft impact
  - Scene 2 headline lines — soft drop per line
  - Scene 3 tab tap — mouse click, at the frame the cursor lands
  - Scene 3 cards — a card-place sound per card, on the same timestamps
  - Scene 4 swatches — soft drop on the 1st, 3rd and 6th only
  - Scene 5 lockup — one bell, allowed to ring as the music fades
- SFX selection guidance: the click must read as a real UI tap; the cards should
  sound like plates landing on a counter, not like casino chips. Use restraint —
  5-7 cues total for the whole video.
- SFX analysis guidance: `~/.claude/skills/brag/assets/sfx/sfx-analysis.md`;
  prefer low/medium high-frequency-risk files since this is a polished tone.
- Exact SFX choice: Hyperframes picks filenames, timestamps, density and volume
  once the animation exists.
- Audio files: copy the chosen music and SFX into
  `brag-output/composition/assets/`.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`,
`hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`,
`hyperframes-cli`. This is the `/brag` workflow: do not enter the `hyperframes`
entry-point intent interview and do not route into the generic promo /
launch-video workflow. Prefer native Hyperframes conventions over anything here.

Requirements:
- Show real UI, copy and photography from the project — at least the headline,
  the menu cards and the sauce colors.
- Keep every line readable: short labels ~0.8s settled, sentences ~0.3s/word.
- Total duration 21.5s.
- Include the music and SFX layer described above.
- Treat cue metadata as timing hints; ignore any cue that hurts readability.
- Lock 3 strong cues (16.02 / 18.02 / 20.02) within ±0.15s; snap sequential
  reveals to the beat grid within ±0.10s; mark them `// beat-locked` and
  `// beat-grid` in the source.
- Wire at least one visual property to per-frame audio data (ember glow / plate
  halo). If extraction is unavailable, note it and continue.
- Use local assets only — no absolute paths, no remote images or fonts.
- Run `npx hyperframes check` before render; it is the single gate.
