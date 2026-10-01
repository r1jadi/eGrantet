# Brag Plan: eGrantet

## What is this app?

eGrantet is a two-sided municipal grants platform: municipalities publish grant programs, citizens apply, and every application passes through deterministic eligibility rules, AI-assisted document verification, blind evaluator scoring, and an explicit human decision — "AI assists. Deterministic rules verify. Humans make final funding decisions."

## The angle

Every AI product brags that AI does everything. This one brags that **the AI doesn't get to decide who gets funding** — and that's the feature. The video plays the governance model as the punchline: "We built an AI grants platform. The AI doesn't decide anything." It's a serious civic product with a sharp, confident twist — anti-hype as hype.

## Hook (first 2-3 seconds)

The product's own founding principle, verbatim, on a quiet full-screen card:

> "AI assists. Deterministic rules verify. Humans make final funding decisions."

Three short lines, staggered in word by word, each clause holding long enough to read. It reads like a mission statement; it's actually the setup for the twist.

## Key moments (the middle)

1. **Grant discovery UI** — a real grant card from the applicant directory: "Community Garden Revival", municipality badge "Gjakova", "Up to €10,000", "Deadline 31.12.2026" — sliding in like a card being dealt, then a second card landing next to it.
2. **The verification panel at work** — a reviewer's checklist appearing row by row: "Registered in Gjakova — PASSED" with a green "Deterministically verified" pill, "Business older than 1 year — PASSED", then a document row "registration-certificate.pdf — Verified · Confidence 97%" tagged "AI-assisted", and one amber warning row "Address mismatch — Needs review" tagged "AI-assisted". The row colors and source pills are the real UI's visual language (mint success / amber warning, deterministic vs AI-assisted pills).
3. **The blind evaluator** — a scoring workspace where a criterion row "Community impact" fills a score bar to 8/10 while "Applicant identity — hidden" stays locked. Score is deterministic; identity never reaches the scorer.

## Outro / punchline

The card rows settle, and the final line lands:

> "Every grant gets decided by a human."
> **eGrantet** — "Bring your local idea to life."

Logo lockup on dark slate, music swells once and fades. The joke-that-isn't-a-joke: the AI stays in its lane, and that's the whole product.

## User flow worth showing

Applicant side: browse open grants → find "Up to €10,000" program → submit application.
Municipality side: open a submitted application → run AI verification (deterministic PASS/FAIL rows + AI-assisted flags) → human decision (Approve).
The video's centerpiece scenes recreate this review flow, because that's where the product's actual thesis lives.

## Tone

- Preset: **polished**
- Creative direction: "a civic-institution product film with one deadpan twist at the end — serious, elegant, quietly confident"
- Interpretation: Fewer scenes, longer holds. Type does the talking; motion stays restrained (soft slides, gentle scale, one shimmer). No shouting, no meme energy. The twist lands through understatement, not exclamation. Dark, premium palette matching the app's own hero gradient.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)

- Background: oklch(97.5% 0.006 246) light app chrome; video canvas uses the app's own hero gradient — slate-950 → #123f69 → #166b75 (steel-blue to teal)
- Accent: #166b75 (teal, from the hero gradient); success mint oklch(45% 0.12 165); warning amber oklch(55% 0.13 75)
- Text: near-white oklch(99% 0.002 246) on dark scenes; ink oklch(23% 0.035 253) on light cards
- Display font: Poppins (bundled, geometric humanist — closest embedded match to the app's DM Sans display voice)
- Body font: IBM Plex Mono (bundled, for data rows, pills, and metadata — "civic form" energy)
- Strongest visual element: the review checklist rows with their source pills ("Deterministically verified" / "AI-assisted") — the product's whole thesis in one UI pattern

## Share copy (draft)

"We built an AI grants platform. The AI doesn't decide anything — deterministic rules verify, humans decide. eGrantet: municipal funding, finally readable."

## Audio direction

- Role: warm cinematic bed with restrained, motion-matched accents
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (steady, clean — best for polished/cinematic)
- Music treatment: start at 0s at 0.32 volume, constant under the film, single swell feel via the track's own accents, fade to 0 over the last 1.2s under the logo
- Music cue guidance: preset read from `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.md` — tempo ~110 BPM. Strong cues to target: **2.73s** (scene 2 card deal), **10.93s** (scene 4 verdict reveal), **18.56s** (logo lockup). Beat grid window for sequential UI rows in scene 3/4: every other beat (~0.55s apart) so text stays readable
- Audio-reactive treatment: subtle — bass band gently modulates the background glow radius and the verification panel's ambient presence; no waveform visuals
- SFX posture: sparse, professional restraint — 5 cues total
- Audio-coupled moments: staggered clause reveals in the hook (soft drops), grant cards dealing (card-place), checklist rows arriving one by one (soft UI ticks), final logo landing (single warm impact bell)
- Restraint rule: no dense percussive stacks, no glitch sounds, nothing comedic — the tone earns trust, doesn't perform

## Storyboard

### Scene 1 — The Principle (hook) — 4.5s
Dark slate-teal gradient field with a slow ambient glow. Three clauses of the project's own principle stagger in, word-group by word-group: "AI assists." / "Deterministic rules verify." / "Humans make final funding decisions." Each line lands fast-in and HOLDS (reading floor respected: sentence ~0.3s/word). A thin teal rule draws under each line as it settles.
Sequential/interaction: yes — 3 text blocks arrive one by one (~0.5s apart), each with a soft drop tick.
Audio intent: quiet anticipation, the bed just starting to breathe.
Audio-coupled idea: soft interface drop per clause reveal.
Music: vol-12 bed, low volume.
Transition mood: soft crossfade → Scene 2

### Scene 2 — Find the grant (applicant side) — 4s
The scene shifts to the product: two grant cards deal onto a canvas like cards being placed — "Community Garden Revival" with a "Gjakova" municipality badge, "Up to €10,000" in teal, "Deadline 31.12.2026", then a second card ("Neighbourhood Mural Fund · Up to €5,000") sliding in after it. Card corners get the app's gradient top-strip. Small mono labels above: "Published grants".
Sequential/interaction: yes — 2 cards dealt one by one; card-place sound per card.
Audio intent: the bed opens up; first feeling of "the product is real".
Audio-coupled idea: card-place SFX on each card landing, aligned to beats (~2.73s strong cue for card one).
Music: continues.
Transition mood: soft slide → Scene 3

### Scene 3 — The verification panel (municipality side) — 5.5s
Centerpiece. A review panel titled "AI verification" (the real panel's title) with a status pill "Completed". Rows appear one by one, each a real UI row shape: icon, requirement name, source pill, result pill —
- "Registered in Gjakova" — pill "Deterministically verified" — green "Passed"
- "Business older than 1 year" — pill "Deterministically verified" — green "Passed"
- "registration-certificate.pdf" — pill "AI-assisted" — green "Verified · 97%"
- "Address mismatch flagged" — pill "AI-assisted" — amber "Needs review"
The footer disclaimer appears last, small and quiet: "AI results are assistance only — deterministic rules and the human reviewer decide."
Sequential/interaction: yes — 4 rows arrive one by one (~0.55s apart on the beat grid), disclaimer last.
Audio intent: rhythmic, procedural, satisfying — each row a soft tick.
Audio-coupled idea: soft UI tick per row; glow breathes with bass.
Music: continues.
Transition mood: clean crossfade → Scene 4

### Scene 4 — The verdict (human decision) — 3.5s
The panel dims; a decision bar rises: "Approve application" button in the app's primary blue, a cursor glides in and clicks it (press-release spring). The status pill flips to green "Approved" with a soft chime. One line above: "Decision: human."
Sequential/interaction: yes — simulated cursor click on the approve button.
Audio intent: the payoff beat — single confident accent, then calm.
Audio-coupled idea: click SFX at press, warm success accent on the pill flip (aligned to 10.93s strong cue).
Music: continues.
Transition mood: gentle crossfade → Scene 5

### Scene 5 — The punchline (outro) — 2.5s
Full-screen dark lockup: "Every grant gets decided by a human." in Poppins, then the wordmark **eGrantet** with the tagline "Bring your local idea to life." (the product's own hero line). Background glow swells once with the music's cue at 18.56s and the bed fades out.
Sequential/interaction: none.
Audio intent: resolution — one swell, then quiet.
Audio-coupled idea: single warm impact bell on the wordmark landing.
Music: fade to 0 by 20s.
Transition mood: end hold.

**Music mood for this video:** cinematic-clean (polished interpretation of an upbeat bed)
**Audio summary:** A steady warm bed at low volume carries the whole film; a handful of restrained UI ticks and card sounds keep the product moments tactile; one confident success accent at the approval and one warm bell on the logo; the bed fades under the final lockup.

## Planning rubric (Step 1 gate)

1. **App?** Two-sided municipal grants platform: publish, apply, verify (deterministic + AI-assisted), review, decide — with humans making every funding call.
2. **Most impressive claim?** "AI assists. Deterministic rules verify. Humans make final funding decisions." — an AI platform that deliberately doesn't let AI decide.
3. **Visual hook?** The verification panel's row pattern: green/amber result pills paired with "Deterministically verified" vs "AI-assisted" source pills.
4. **Show from the actual UI?** Grant cards from the public directory; the AI verification panel; the municipal review actions ("Approve application"); status pills from `statusLabels`.
5. **Shortest satisfying video?** 20s — hook (4.5) + discovery (4) + verification (5.5) + decision (3.5) + outro (2.5).
6. **Tone?** Preset `polished`; direction "civic-institution product film with one deadpan twist."
7. **Audio feel?** Warm clean bed, sparse motion-matched SFX, one swell at the end — polished restraint.
8. **Share caption?** "We built an AI grants platform. The AI doesn't decide anything — deterministic rules verify, humans decide. eGrantet: municipal funding, finally readable."
9. **User flow worth showing?** Browse published grants → open submitted application → run verification (deterministic PASS rows + AI-assisted flags) → human approves. Recreated as scenes 2→4.
