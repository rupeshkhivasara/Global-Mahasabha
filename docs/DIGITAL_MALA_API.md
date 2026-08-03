# Digital Mala — Implementation Documentation

Covers the full client implementation (screen, components, state, persistence, speech/TTS integration) and the backend contract it depends on. The client is fully built and running today against a **local, client-side stand-in** for scoring/counting because the real backend endpoint is not deployed yet (`/api/digital_mala.php` returns 404 in production). Section 13 is the backend requirement — build that and the client swaps over with the changes noted in Section 14.

---

## 1. File map

| File | Role |
| --- | --- |
| `src/DigitalMala/screens/DigitalMalaScreen.tsx` | The entire screen: layout, necklace geometry, icons, styling, session/speech/TTS logic. |
| `src/store/digitalMalaSlice.ts` | Redux slice — counters, session flag, streak, accuracy threshold. |
| `src/store/malaPersistence.ts` | AsyncStorage read/write for the durable subset of that state. |
| `src/store/index.ts` | Store wiring, boot-time hydration, debounced auto-save subscription. |
| `src/utils/textSimilarity.ts` | Client-side Levenshtein accuracy scorer (temporary stand-in for server AI scoring). |
| `src/api/endpoints/digitalMala.ts` | The real API client functions (`getMalaSummary`, `startMalaSession`, `validateNavkarRecitation`, `stopMalaSession`) — written, typed, but **not currently called** by the screen; wired up once the backend exists. |
| `src/api/config.ts` | `ENDPOINTS.DIGITAL_MALA = '/api/digital_mala.php'`. |
| `src/api/client.ts` | Axios instance; injects `X-User-Id` header on every request from the authenticated user id. |
| `src/DigitalMala/assets/mala-bg.jpg` | Full-bleed background photo. |
| `src/Vihar/screens/RootNavigator.tsx` | Registers the screen as `AppStack.Screen name="DigitalMala"`. |

---

## 2. Screen architecture

`DigitalMalaScreen.tsx` exports one default component, `DigitalMalaScreen`, plus a set of module-level helper components/functions it composes:

```
DigitalMalaScreen (default export)
├── useNecklaceGeometry(screenWidth)      — necklace sizing/points, memoized
├── makeStyles(scale)                     — the whole StyleSheet, rebuilt per scale
├── NecklaceLoop({ litCount, geometry })  — renders the 108-bead ring + tassel + shimmer
│     └── Svg / Defs / RadialGradient / ClipPath / G (react-native-svg primitives)
└── Icon components (all react-native-svg, stateless):
      LotusIcon, TargetIcon, SpeakerIcon, HelpIcon, MicIcon, MalaPendantIcon,
      CalendarIcon, BarChartIcon, NavHomeIcon, NavRecordIcon, NavGlobeIcon,
      NavProfileIcon, PeopleIcon, ChevronRightIcon
```

### 2.1 Visual structure (top → bottom)

1. Full-bleed background `Image` (`BACKGROUND_IMAGE`), sized to `useWindowDimensions()` explicitly (not `StyleSheet.absoluteFill`) so it always covers the real screen even if a parent container doesn't propagate `flex:1`.
2. `ScrollView` (`styles.scroll` / `styles.content`), top-padded by `useSafeAreaInsets().top` so the logo never sits under a notch/camera cutout; bottom-padded to clear the fixed nav bar.
   - **Logo block** (`styles.logoBlock`): `LotusIcon`, "JapMala" wordmark, tagline.
   - **Necklace loop** (`styles.loopWrap` → `NecklaceLoop` + `styles.innerContent`):
     - `NecklaceLoop` draws the 108-bead ring, cap bead, tassel, and shimmer sweep (SVG).
     - `innerContent` is absolutely positioned *inside* the loop and holds:
       - Progress card ("आज की प्रगति")
       - Goal card ("आज का लक्ष्य") with progress bar
       - Mantra block (caption, mantra text, waveform bars, `voiceMessage` helper line)
       - Controls row (सुनें / mic / सहायता)
       - Accuracy line (conditional)
       - "जाप सत्र समाप्त करें" stop link (conditional, session-active only)
   - **Stats row** (`styles.statsRow`): 3 cards — कुल जाप / लगातार / कुल मंत्र.
   - **Campaign card** (`styles.campaignCard`): "7 करोड़ मंत्र जाप अभियान" banner + progress bar.
3. Fixed bottom **nav bar** (`styles.navBar`, `position:'absolute'`), 5 items, raised center "जाप करें" button.

---

## 3. Necklace bead geometry (`useNecklaceGeometry`)

Reproduces the design mock's `malaPathPoints()`/`buildMalaRing()` (from `support.js`): 108 bead centers sampled at **equal arc-length** around a rounded-rectangle path, not equal angle — this is what makes the beads look evenly strung.

| Function | Purpose |
| --- | --- |
| `buildNecklaceSegments(bounds)` | Builds the rounded-rect outline as 8 line/arc segments (4 straight edges + 4 corner arcs), starting and ending at the top-center point, matching the SVG path `M150,40 L245,40 A40,40 0 0 1 285,80 …`. |
| `pointAtArcLength(segments, s)` | Walks the segment list and returns the `{x,y}` point at arc-length `s` — the manual equivalent of SVG's `getPointAtLength()`, which React Native doesn't expose. |
| `useNecklaceGeometry(screenWidth)` | Computes a `scale` factor (`screenWidth / 340`, clamped to `[1, 1.25]`, memoized on `scale`), scales every base measurement (`BASE_LOOP_WIDTH`, `BASE_BOUNDS`, `BASE_INNER`, `BASE_CAP_SIZE`, `BASE_TASSEL`) by it, samples 108 points via `pointAtArcLength`, and returns a `NecklaceGeometry` object. |

The design's reference frame is 340px wide; geometry never shrinks below the design's own 300px loop and is capped at 1.25× so it doesn't balloon on tablets — the necklace *shape* itself is never distorted, only uniformly scaled.

`NecklaceGeometry` shape: `{ scale, loopWidth, loopHeight, beadRadius, capSize, tassel: {width,height,radius}, inner: {left,top,width,height}, points: {x,y}[] }`.

### 3.1 `NecklaceLoop` rendering

- **Tassel/cap placement**: anchored off `points[0].y` (the first bead's actual position) rather than a fixed offset above the container, so they sit against the loop with a slight overlap instead of floating in the loop's ~40-unit top margin.
- **Bead 3D look**: each of the 108 points renders as 3 stacked SVG shapes (paint order matters):
  1. A soft offset `Circle` shadow (`rgba(60,35,10,0.3)` unlit / `rgba(110,66,10,0.4)` lit) for contact/depth between adjacent beads.
  2. The bead body — `Circle` filled with `url(#pearlBead)` or `url(#goldBead)` (`RadialGradient`s defined once in `Defs`, `gradientUnits="objectBoundingBox"` so each bead gets its own independent highlight regardless of its position in the shared `Svg`).
  3. A specular highlight `Ellipse` (white, low opacity) for the glossy-sphere look.
- **Shimmer sweep**: `shimmerProgress` state advances via `setInterval` (50ms tick, resets at 1) inside a `useEffect`; drives a diagonal `Rect` filled with the `malaSweep` `SvgLinearGradient`, clipped to a `ClipPath` built from all 108 bead circles (`malaBeadClip`) so the sheen only ever appears on the beads, never on the content inside the loop.
- **Bead color**: `i < litCount` → gold ("moti"); `litCount` is `sessionCount % MALA_SIZE`, i.e. how far through the *current* 108-count round the active session is.

---

## 4. Styling / responsive scale (`makeStyles`)

`makeStyles(scale)` rebuilds the entire `StyleSheet` from a single `scale` number via a local `rs(n) = Math.round(n * scale)` helper, called once per render via `useMemo(() => makeStyles(scale), [scale])`. `scale` is `Math.min(1.12, necklace.scale)` — deliberately more conservative than the necklace's own scale cap, keeping typography close to the 340pt reference so it doesn't look heavier than the design on normal phones.

- Card/icon-circle radii, paddings, gaps, and font sizes all run through `rs()`.
- Screen-edge horizontal margins (`marginHorizontal: 22`) are a fixed design token, deliberately **not** scaled.
- Gradient-backed icon circles (`jmIconCircle`, `campaignIconCircle`) carry `overflow:'hidden'` so the gradient's rectangular bounds never peek out past the rounded corners.
- `CARD_SHADOW` uses a tight `shadowRadius:5 / shadowOffset:{0,3}` — a larger radius reads as a rectangular halo behind rounded corners on iOS, since a semi-transparent `backgroundColor` prevents iOS from deriving a rounded shadow mask.
- `CARD_GLASS` / `CARD_SURFACE` are opaque warm surface colors (not translucent `rgba`) — Android was compositing nested transparent child views separately over the `Image` background, producing a pale rectangle behind text even when colors matched on paper.
- Nav bar/nav labels use `numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}` so longer Hindi labels ("जाप रिकॉर्ड") shrink to fit rather than wrapping/clipping.

---

## 5. State management — `digitalMalaSlice`

Redux slice, `state.digitalMala`. **This is a TEMPORARY client-side source of truth** standing in for the backend's `MalaSummary` (see §13) — the field names were deliberately kept identical so the eventual swap is mechanical.

### 5.1 State shape

| Field | Type | Meaning |
| --- | --- | --- |
| `todayCount` | `number` | Accepted chants today (rolls over at midnight local date). |
| `todayDate` | `string` (ISO date) | Date `todayCount` was last accumulated for. |
| `sessionCount` | `number` | Accepted chants in the *current* session; resets to 0 on start/end. |
| `lifetimeCount` | `number` | Lifetime accepted-chant total ("कुल मंत्र"). |
| `globalCount` | `number \| null` | Cross-user total for the campaign banner. `null` until a real backend exists — renders as "उपलब्ध नहीं", never a fabricated number. |
| `completedMalas` | `number` | Lifetime count of completed 108-chant rounds ("कुल जाप"). |
| `accuracyThreshold` | `number` | Minimum `accuracy` (0–100) required to accept a chant. Default `70`. |
| `goalMala` | `number` | Daily goal shown on "आज का लक्ष्य". Default `5`; no settings UI yet to change it. |
| `streak` | `number` | Consecutive calendar days with ≥1 accepted chant. |
| `lastActiveDate` | `string \| null` | Last date the streak was already incremented for (prevents double-counting same-day). |
| `isSessionActive` | `boolean` | Whether a chanting session is currently open. |
| `lastAccuracy` | `number \| null` | Most recent chant's accuracy score (not directly read by the screen, which keeps its own local `lastAccuracy` state — see §7). |
| `hydrated` | `boolean` | Whether `AsyncStorage` hydration has completed. |

### 5.2 Actions / reducers

| Action | Dispatched from | Effect |
| --- | --- | --- |
| `hydrated(payload)` | `hydrateStore()` at app boot | `Object.assign`s the persisted subset onto state, sets `hydrated:true`, then runs `rolloverDayIfNeeded`. |
| `sessionStarted()` | `startJapa()` | Runs `rolloverDayIfNeeded`; sets `isSessionActive:true`, `sessionCount:0`, `lastAccuracy:null`. |
| `chantAccepted({accuracy})` | `processTranscript()` on acceptance | Runs `rolloverDayIfNeeded`; increments `sessionCount`, `todayCount`, `lifetimeCount`; sets `lastAccuracy`; if `sessionCount % 108 === 0` increments `completedMalas`; updates `streak`/`lastActiveDate` (see §5.3). |
| `chantRejected({accuracy})` | `processTranscript()` on rejection | Only updates `lastAccuracy` — no counters move. |
| `sessionEnded()` | `endSession(reason)` | Sets `isSessionActive:false`, `sessionCount:0`. |

### 5.3 Day-rollover & streak logic

- `rolloverDayIfNeeded(state)`: if `state.todayDate !== todayIso()`, resets `todayCount` to 0 and bumps `todayDate` — called at the top of every reducer that could straddle a midnight boundary (`hydrated`, `sessionStarted`, `chantAccepted`).
- Streak increments **once per calendar day**, on the first `chantAccepted` where `lastActiveDate !== todayDate`: `isConsecutiveDay(lastActiveDate, todayDate) ? streak+1 : 1` (a gap of more than one day resets the streak to 1, not 0, since the chant that just landed itself counts as day one of a new streak).

---

## 6. Persistence

- `src/store/malaPersistence.ts`: `loadPersistedMala()` / `savePersistedMala(state)` — plain `AsyncStorage` JSON read/write under key `@digital_mala_state`, both best-effort (a failed write silently no-ops rather than crashing; state simply replays from the last successful save next launch).
- `src/store/index.ts`:
  - `hydrateStore()` — called once at app boot (outside this file, wherever app bootstrap runs); loads persisted state and dispatches `hydrated(persisted)`. The store is usable before this resolves — everything starts at zero and hydrates in-place.
  - `store.subscribe(...)` — after every dispatch, pulls the *durable* subset of `digitalMala` state (`PersistedDigitalMala`: `todayCount, todayDate, lifetimeCount, globalCount, completedMalas, accuracyThreshold, goalMala, streak, lastActiveDate` — deliberately excludes `sessionCount`/`isSessionActive`/`lastAccuracy`/`hydrated`, which are session-transient), diffs it against `lastSnapshot` to skip redundant writes, and debounces the actual `savePersistedMala` call by 500ms so a rapid burst of accepted chants writes once, not per-chant.

---

## 7. Full user flow (with function names)

### 7.1 App boot
`hydrateStore()` → `loadPersistedMala()` → dispatch `hydrated(payload)` → reducer applies persisted counters + runs `rolloverDayIfNeeded`.

### 7.2 Landing on the screen
`DigitalMalaScreen` mounts:
- `useNecklaceGeometry(screenWidth)` computes bead geometry once (memoized on `scale`).
- Local state initializes: `lastAccuracy=null`, `isListening=false`, `isGuidePlaying=false`, `voiceMessage='माइक के पास स्पष्ट उच्चारण करें'`.
- A `useEffect` wires the three speech-recognition event listeners once on mount (see §8) and returns a cleanup that tears them down, stops listening, and stops TTS.
- A second `useEffect` subscribes to `AppState` changes to call `endSession('background')` when the app leaves the foreground.

### 7.3 Starting a session — `onMicPress` → `startJapa`
Tapping the mic when `!isSessionActive` calls `startJapa()`:
1. Guard: bail if no `user`, already active, or guide already playing.
2. `requestMicrophoneConsent()` — an `Alert` with "Not now"/"Continue"; bails if declined. (`cancelable:false` — some Android versions fire `onDismiss` while a button handler is still resolving, which can otherwise swallow "Continue".)
3. **Android only**: `PermissionsAndroid.request(RECORD_AUDIO)`. If denied, sets a helper message; if permanently denied (`NEVER_ASK_AGAIN`), shows an `Alert` offering `Linking.openSettings()`.
4. Dispatch `sessionStarted()`; reset the local accuracy accumulator refs (`sessionAccuracyTotalRef`, `sessionAcceptedRef`).
5. `clearSessionTimeout()` then arm a new one: `setTimeout(() => endSession('timeout'), SESSION_TIMEOUT_MS)` (30 minutes — client-side default; no server value exists for this yet).
6. `shouldListenRef.current = true`; set `isGuidePlaying=true`; `await playGuide()` (TTS reads the full Navkar Mantra, see §9).
7. On guide completion, `isGuidePlaying=false`; if still supposed to be listening, `await startRecognition()`.
8. Any thrown error clears `shouldListenRef`, clears `isGuidePlaying`, and surfaces the error message (or a generic Hindi fallback) via `voiceMessage`.

### 7.4 Listening loop — speech events → `processTranscript`
`startRecognition()`:
- No-ops if not supposed to be listening, already processing, or already running.
- Checks `isRecognitionAvailable()`; on success calls `setRecognitionLanguage('en-IN')` then `startListening()`, sets `isListening=true`.
- On any failure, resets flags and shows "अभी माइक उपलब्ध नहीं है…" (never surfaces the raw native error).

The three subscribed events (`speechRecogntionEvents.RESULTS/END/ERROR`) drive the loop via `processTranscriptRef`/`startRecognitionRef` (refs holding the latest callback identities, so the native listeners set up once on mount are never torn down/rebuilt mid-session just because `processTranscript` picked up a new `user` reference):
- **RESULTS** → `processTranscriptRef.current(event.value)`.
- **END** → if still listening and not mid-processing, re-arm `startRecognition` after a 250ms delay.
- **ERROR** → same re-arm, 350ms delay.

`processTranscript(transcript)`:
1. Guards: no-op without a `user`, inactive session, already-processing, or empty transcript.
2. Sets `processingRef=true`, stops the "listening" UI state, shows "उच्चारण जाँचा जा रहा है…".
3. **TEMPORARY**: scores locally via `computeMantraAccuracy(transcript, NAVKAR_MANTRA)` (see §10) instead of calling the backend.
4. `accepted = accuracy >= accuracyThreshold`:
   - **Accepted**: accumulates into `sessionAccuracyTotalRef`/`sessionAcceptedRef`; dispatches `chantAccepted({accuracy})`; `Vibration.vibrate(18)`; `playAcceptChime()`; sets `voiceMessage` to a mala-complete celebration string if this chant just completed a round (`sessionCount % MALA_SIZE === 0` after increment), else back to the default helper line.
   - **Rejected**: dispatches `chantRejected({accuracy})`; resets `voiceMessage` to the default helper line.
5. `finally`: clears `processingRef`; if still supposed to be listening, re-arms `startRecognition` after 350ms.

### 7.5 Pause / resume — `pauseOrResume`
Only reachable via `onMicPress` while `isSessionActive`:
- If currently listening: flips `shouldListenRef`/`recognizerRunningRef` off, `stopListening()`, sets `isListening=false`, shows "जाप रोका गया".
- Otherwise: flips `shouldListenRef` on and calls `startRecognition()` again.
- No-ops entirely while the guide audio is still playing.

### 7.6 Ending a session — `endSession(reason)`
Three call sites, three `reason`s: `stopJapa()` (manual, via the "जाप सत्र समाप्त करें" link) → `'manual'`; the session timeout `setTimeout` → `'timeout'`; the `AppState` listener → `'background'`.
1. No-op if no session is active.
2. `clearSessionTimeout()`, flip listening flags off, `stopListening()`, `Tts.stop()`.
3. Compute `averageAccuracy` from the session accumulator refs.
4. Dispatch `sessionEnded()`.
5. `'background'` returns immediately (no alert while the app isn't foregrounded). `'manual'`/`'timeout'` show a summary `Alert` (accepted count, average accuracy, malas completed) and reset `voiceMessage`.

### 7.7 Ancillary actions
- **सुनें (Listen preview)** → `playListenPreview()` — TTS speaks the mantra once, independent of session/listening state.
- **सहायता (Help)** → `showHelp()` — static explanatory `Alert`.

---

## 8. Speech recognition integration

Library: `react-native-speech-recognition-kit` (a real TurboModule, verified against native source — unlike `react-native-tts`, see §9). Functions used: `isRecognitionAvailable`, `setRecognitionLanguage`, `startListening`, `stopListening`, `destroy`, `addEventListener` + `speechRecogntionEvents.{RESULTS,END,ERROR}`.

All calls to it (and to `react-native-tts`) go through three defensive wrappers, since a young/single-maintainer native module can still throw synchronously before a `.catch()` ever attaches:
- `safeCall(fn)` — swallow synchronous throws.
- `safeAsync(fn)` — swallow both synchronous throws and rejected promises, always resolves.
- `safeSubscribe(fn)` — returns the subscription or `null` if registering it threw.

---

## 9. TTS integration

Library: `react-native-tts` — a **legacy bridge-only module with no TurboModule support**; with this project's `newArchEnabled=true` its native module can resolve to `null` at runtime, so every call site is wrapped in `safeAsync`/`safeCall` as cheap insurance.

Three distinct uses:
1. **Guide playback** (`playGuide()`, inside `startJapa`) — sets language `en-IN`, rate `0.37` (slow, for a full mantra read-through), speaks `NAVKAR_MANTRA`, resolves on `tts-finish`/`tts-error` or a 30s hard timeout.
2. **Listen preview** (`playListenPreview()`) — language `en-IN`, rate `0.4`, speaks `NAVKAR_MANTRA` once, on demand.
3. **Accept chime** (`playAcceptChime()`) — rate `0.75`, pitch `1.7`, speaks the literal word `"Ding"`. There's no bell audio asset or sound-playback library in the project; adding one means a new native module with the same pod-linking risk `react-native-voice`/`react-native-tts` already have, so this reuses the already-linked TTS engine as a lightweight stand-in chime.

---

## 10. Accuracy scoring — current client-side stand-in

`computeMantraAccuracy(transcript, reference)` in `src/utils/textSimilarity.ts`:
1. `normalize(text)` — lowercases, NFKD-normalizes, strips everything but `[a-z0-9]`.
2. `levenshteinDistance(a, b)` — standard single-row DP edit distance.
3. Similarity `= (1 - distance / max(len(a), len(b))) * 100`, clamped to `[0, 100]` and rounded.

This is explicitly a **temporary** local approximation, character-level and tolerant of minor recognition drift, standing in for the backend's real AI-driven speech-similarity scoring described in §13. The acceptance decision (`accuracy >= accuracyThreshold`) currently happens **client-side** in `processTranscript` — per the backend contract's server-owned rule, this must move server-side once the endpoint exists.

---

## 11. Icon library

All hand-drawn inline SVG (`react-native-svg`), each accepting an optional `scale` prop (default `1`) multiplying its own fixed width/height so every icon grows with the screen's `scale` factor:

| Component | Used for |
| --- | --- |
| `LotusIcon` | Brand mark — logo, progress-card icon, mantra block, nav center button. Takes explicit `size`/optional `height` (not a `scale` prop) since it's used at several non-uniform sizes. |
| `TargetIcon` | Goal card ("आज का लक्ष्य"). |
| `SpeakerIcon` | सुनें control. |
| `HelpIcon` | सहायता control. |
| `MicIcon` | Primary mic CTA. |
| `MalaPendantIcon` | कुल जाप stat. |
| `CalendarIcon` | लगातार stat. |
| `BarChartIcon` | कुल मंत्र stat. |
| `PeopleIcon` | Campaign banner icon. |
| `ChevronRightIcon` | Campaign banner "view more" affordance. |
| `NavHomeIcon`, `NavRecordIcon`, `NavGlobeIcon`, `NavProfileIcon` | Bottom nav (4 of the 5 items — the 5th, "जाप करें", uses `LotusIcon` inside the raised center button). |

---

## 12. Navigation entry point

Registered in `src/Vihar/screens/RootNavigator.tsx` as `AppStack.Screen name="DigitalMala" component={DigitalMalaScreen}` (route param type `undefined` — no params expected). The screen's own "होम" nav item calls `navigation.goBack()` rather than navigating to a specific route.

---

## 13. Backend requirement

The mobile client calls `POST /api/digital_mala.php` with URL-encoded fields and the authenticated `X-User-Id` header already supplied by `src/api/client.ts`'s request interceptor. **This endpoint is not deployed** (confirmed 404) — everything in §5–§10 above is the client's interim substitute for it.

### 13.1 Server-owned rule

The server is authoritative. It must compare the spoken Navkar Mantra with the canonical reference, calculate `accuracy`, and mutate counts only when `accuracy >= accuracy_threshold`. **The app must never make its own acceptance decision** once this exists — `computeMantraAccuracy`/the local threshold check in `processTranscript` get deleted at that point (see §14).

Canonical reference (`mantra=navkar`):

```text
Namo Arihantanam. Namo Siddhanam. Namo Ayariyanam.
Namo Uvajjhayanam. Namo Loye Savva Sahunam. Eso Pancha Namokkaro.
Savva Pavappanasano. Mangalanam Cha Savvesim. Padhamam Havai Mangalam.
```

### 13.2 Actions

| Action | Request fields | Required response data |
| --- | --- | --- |
| `summary` | `user_id` | `today_count`, `session_count`, `lifetime_count`, `global_count`, `completed_malas`, `accuracy_threshold` |
| `start_session` | `user_id`, `mantra=navkar` | `session_id`, `accuracy_threshold`, `summary` |
| `validate_recitation` | `user_id`, `session_id`, `mantra=navkar`, `transcript` | `accepted`, `accuracy`, `accuracy_threshold`, `summary` |
| `stop_session` | `user_id`, `session_id`, `accepted_count` | `average_accuracy`, `summary` |

All actions use the existing main API response envelope:

```json
{ "success": true, "message": "", "data": {} }
```

Field naming matches `MalaSummary`/`MalaSession`/`MantraValidation` already typed in `src/api/endpoints/digitalMala.ts` — the client functions (`getMalaSummary`, `startMalaSession`, `validateNavkarRecitation`, `stopMalaSession`) are written and ready to call this contract as soon as it exists.

For a server using raw audio rather than device speech recognition, retain the same `validate_recitation` response and add an `audio_reference` or uploaded-audio field to its request. Counts must remain server-authoritative and **idempotent** per `session_id` + recitation identifier (a retried/duplicate `validate_recitation` call for the same recitation must not double-count).

### 13.3 Additional fields the client already expects but the contract above doesn't yet cover

- **`global_count`** for the campaign banner ("6,91,23,554 / 7,00,00,000") — already in `summary`'s `global_count`, just needs a real cross-user aggregate behind it. The campaign's fixed target (`CAMPAIGN_TARGET = 70,000,000` in the client) is static branding copy ("7 करोड़ मंत्र जाप अभियान"), not something the backend needs to supply — only the live numerator (`global_count`) is real backend data.
- **`streak`** — not in the current `summary` contract at all; the client computes it itself from `chantAccepted` timestamps (§5.3). Decide whether streak becomes server-computed (recommended, since it should be tamper-resistant and cross-device-consistent) or stays a client derivation seeded from `lastActiveDate`/`todayDate` if those get added to `summary`.
- **`goal_mala`** — also not in the contract; currently a fixed client constant (`DEFAULT_GOAL_MALA = 5`) with no settings UI to change it. Add it to `summary` (and a way to update it) once a goal-setting UI exists.
- **Session timeout** — `SESSION_TIMEOUT_MS = 30 minutes` is a client-only default (per the code comment, "No server-side value exists for this yet, unlike accuracy_threshold"). If the server should own this too, add it alongside `accuracy_threshold` in the `summary`/`start_session` response.

---

## 14. Migration checklist — swapping the client stand-ins for the real backend

Once §13 is deployed:

1. In `DigitalMalaScreen.tsx`, replace the local Redux-only session flow with calls to `startMalaSession`/`validateNavkarRecitation`/`stopMalaSession` from `src/api/endpoints/digitalMala.ts`:
   - `startJapa` → call `startMalaSession(userId)`, store the returned `session_id`, use its `accuracy_threshold`.
   - `processTranscript` → call `validateNavkarRecitation({userId, sessionId, transcript})` instead of `computeMantraAccuracy` + local threshold check; use the response's `accepted`/`accuracy` directly.
   - `endSession` → call `stopMalaSession({userId, sessionId, acceptedCount})` and use its `average_accuracy` in the summary alert instead of the locally-accumulated `sessionAccuracyTotalRef` average.
2. Delete `src/utils/textSimilarity.ts` and its import once `validate_recitation` is authoritative.
3. Replace `digitalMalaSlice`'s locally-mutated counters with values read straight from each response's `summary` object (the field names were kept 1:1 with `MalaSummary` specifically so this is close to a mechanical rename, not a rewrite).
4. Decide the fate of `streak`/`goal_mala`/session-timeout per §13.3, and remove the corresponding client-side computation once the backend owns it.
5. `src/store/malaPersistence.ts`/the debounced-save subscriber in `src/store/index.ts` can likely be simplified or removed if the backend becomes the source of truth on every screen focus — or kept as an offline-cache layer, decide per product requirements.
