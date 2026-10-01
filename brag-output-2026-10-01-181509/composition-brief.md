# Hyperframes Composition Brief: eGrantet

## Objective
Create a short launch-style brag video for eGrantet, a two-sided municipal grants platform.

## Output
- Composition directory: `brag-output-2026-10-01-181509/composition/`
- Rendered video: `brag-output-2026-10-01-181509/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `.` (Next.js App Router app)
- Primary files read: `src/app/page.tsx`, `src/app/globals.css`, `src/modules/grants/components/grant-card.tsx`, `src/modules/verification/components/verification-panel.tsx`, `src/modules/applications/components/municipal-review-actions.tsx`, `src/lib/i18n/dictionaries/en.ts`, `AGENTS.md`, `ARCHITECTURE.md`
- Product name: eGrantet
- Tagline / strongest claim: "AI assists. Deterministic rules verify. Humans make final funding decisions."
- Key UI or visual moment to recreate: the AI verification panel — requirement rows with source pills ("Deterministically verified" / "AI-assisted") and result pills ("Passed" / "Verified" / "Needs review"); the grant card with gradient top strip; the "Approve application" review action
- Copy that must appear verbatim:
  - "AI assists. Deterministic rules verify. Humans make final funding decisions."
  - "AI verification" (panel title)
  - "Deterministically verified" / "AI-assisted" (source pills)
  - "Passed" / "Verified" / "Needs review" (result pills)
  - "Approve application" (button label)
  - "Approved" (status pill)
  - "Up to €10,000" / "Deadline 31.12.2026" (grant card patterns: "Up to {amount}", "Deadline {date}")
  - "AI results are assistance only — deterministic rules and the human reviewer decide."
  - "Bring your local idea to life." (hero line)
  - "Every grant gets decided by a human." (video's closing line — free framing, asserts nothing new)
  - Applicant/org names shown are FICTIONAL stand-ins ("Community Garden Revival", "Neighbourhood Mural Fund", "Gjakova") — no real applicant data exists in the video

## Creative Direction
- Tone preset: polished
- Creative direction: "a civic-institution product film with one deadpan twist at the end — serious, elegant, quietly confident"
- Interpretation: fewer scenes, longer holds; restrained entrances (0.4-0.6s soft slides/fades); type-forward; one shimmer maximum; the twist lands through understatement
- Angle: anti-hype as hype — an AI grants platform whose whole pitch is that the AI doesn't get the final word
- Hook: the project's own principle, three clauses staggering in on a dark slate-teal field
- Outro / punchline: "Every grant gets decided by a human." → eGrantet wordmark + "Bring your local idea to life."
- Avoid:
  - Generic SaaS language ("streamline", "supercharge", "10x")
  - Abstract filler visuals
  - Unrelated visual redesign; meme energy; dense SFX stacks

## Visual Identity
- Background: dark canvas = the app's own hero gradient (slate-950 → #123f69 → #166b75); light card surfaces = #ffffff with the app's ink text
- Text: near-white oklch(99% 0.002 246) ≈ #fbfcfe on dark; ink oklch(23% 0.035 253) ≈ #2a3542 on light cards
- Accent: #166b75 teal (hero gradient end); success mint ≈ oklch(45% 0.12 165) with its oklch(95% 0.03 166) background; warning amber ≈ oklch(55% 0.13 75) with oklch(96% 0.05 90) background; primary steel-blue oklch(43% 0.13 252) ≈ #1f4e8c for the approve button
- Display font: Poppins (bundled) — display/headlines
- Body font: IBM Plex Mono (bundled) — labels, pills, data rows, metadata
- Visual references from the project: hero gradient section of the landing page; GrantCard gradient top-strip + municipality Badge + "Up to €X" + deadline row; VerificationPanel row cards with icon + name + source pill + result pill; StatusBadge rounded-full pills; the audit-trail list rhythm

## Storyboard
Use the storyboard in `brag-output-2026-10-01-181509/brag-plan.md` as the creative contract.

Scene summary:
1. The Principle (hook) — 4.5s — three clauses of the principle stagger in and hold; thin teal rules draw under each
2. Find the grant — 4s — two grant cards deal in one by one with municipality badge, "Up to €10,000", deadline; "Published grants" mono label
3. The verification panel — 5.5s — "AI verification" panel; 4 rows arrive one by one (2 deterministic PASSED, 1 AI-assisted Verified 97%, 1 AI-assisted Needs review); disclaimer line last
4. The verdict — 3.5s — decision bar with "Approve application"; simulated cursor click; status pill flips to green "Approved"; caption "Decision: human."
5. The punchline — 2.5s — closing line, wordmark eGrantet, tagline; music fades

## Audio
- Audio role: warm cinematic bed with restrained, motion-matched accents
- Audio arc: bed fades in quickly at 0, stays low and constant, one confident accent at the approval (scene 4), warm bell on the wordmark, bed fades to 0 across the final 1.2s
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (copied to `composition/assets/music/`)
- Music treatment: 0.32 static volume on track 10; data-automation volume lane: fade 0→0.32 over 0.6s at start; hold; fade 0.32→0 from 18.8s to 20s
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (tempo ~110 BPM). Strong cues targeted: 2.73s (first card deal), 10.93s (approval payoff), 18.56s (wordmark landing). Sequential UI rows in scenes 3/4 snap to every other beat (~0.55s spacing) for readability
- Audio-reactive treatment: subtle — pre-extract per-frame audio bands and let bass (bands[0]) modulate the background glow radius/breath and the panel's ambient presence. No waveform/equalizer visuals. If extraction is unavailable, note it and skip — do not block the render
- Audio-coupled moments:
  - Scene 1 — soft interface drop per clause reveal (3 total)
  - Scene 2 — card-place sound per card landing (2 total; first aligned to 2.73s)
  - Scene 3 — soft UI tick per row arrival (4 rows, every other beat)
  - Scene 4 — cursor click at press; warm success accent on pill flip (10.93s)
  - Scene 5 — single warm impact bell on wordmark (18.56s)
- SFX selection guidance: from the skill's SFX library — interface drop_* for clause reveals, casino card-place for cards, low-key UI ticks for rows, ui click for the cursor press, impact bell for the logo. Keep total cues sparse (~7); prefer low high-frequency-risk files
- SFX analysis guidance: use `assets/sfx/sfx-analysis.md` from the /brag skill when present
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density, and volume based on the implemented animation
- Audio files: music already copied to `composition/assets/music/`; copy chosen SFX into `composition/assets/sfx/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI recreation (scenes 2-4 are all real-UI recreations)
- Keep all text readable: fast-in then hold; sentence lines hold ≥0.3s/word; rows in scene 3 hold ≥0.8s settled each
- Keep the video within 15-25 seconds (target 20s)
- Include the planned music/SFX layer
- Treat /brag audio notes as guidance, not a fixed cue sheet
- Major reveals may move toward nearby strong cues within ~0.15s; smaller entrances within ~0.10s; 1-3 strong cue locks total
- When music is present, consider the audio-reactive workflow (extract per-frame bands; subtle glow/presence modulation only)
- Use local assets for audio; no remote runtime dependencies
- Run `hyperframes check` before render — it is brag's single gate
- Keep creation and rendering local; no publishing
- Seek-safety: single paused GSAP timeline registered on `window.__timelines["egrantet-brag"]`; `fromTo` everywhere; no CSS-transform/GSAP conflicts; no `repeat: -1`; no tweens of `display`/`visibility` on clips; every `<audio>` has an id; no `crossorigin` on media; lint errors switch off later audits so clear them first
