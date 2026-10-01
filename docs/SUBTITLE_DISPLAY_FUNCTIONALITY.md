# Subtitle Display Functionality

This note documents the subtitle display behavior added for the YouTube video overlay. It covers only the display path: how subtitle text is grouped, selected by playback time, mounted into YouTube, and rendered on top of the video.

## Goal

The extension should show subtitles like stable YouTube caption cards:

- group words into readable phrases
- show one immutable card for its whole media-time interval
- replace the card only at a phrase, punctuation, line-capacity, or duration boundary
- never animate individual words or characters
- never append every new word to the current visible subtitle
- never show a long paragraph all at once
- never let the visible subtitle exceed two lines

The important rule is:

> One subtitle interval equals one stable subtitle card.

After a card appears, its text must not change. React should rerender only when the active card changes.

## Main Active Display Path

These files are used by the current YouTube content-script overlay.

### `entrypoints/content.tsx`

This is the active browser content script for YouTube watch pages.

Display responsibilities:

- mounts the subtitle overlay into YouTube's player
- hides native YouTube captions while AI subtitles are active
- converts translated cues into stable phrase cards
- tracks video playback time
- selects the active card using `findActiveCue`
- rerenders the overlay only when the active card index changes

Important functions:

- `createPhraseCardTrack(track)`
  - converts translated cue text into phrase-card display segments
  - uses `SubtitlePhraseCardPlanner`
  - returns `TranslatedSegment[]` that the existing overlay can render

- `renderOverlay()`
  - finds the YouTube player
  - gets the currently active subtitle card
  - renders `<SubtitleOverlay />` into the player

- `setupVideoListeners()`
  - listens to video `timeupdate` and `seeking`
  - updates `runtimeState.activeIndex`
  - calls `renderOverlay()` only when the active card changes

### `components/SubtitleOverlay.tsx`

This is the visible subtitle component.

Display responsibilities:

- renders the active phrase card
- draws the stable black subtitle panel
- wraps text into at most two visible lines
- applies font size, color, alignment, position, opacity, and shadow settings
- handles bilingual display when enabled
- does not do word timing, animation, or progressive reveal

Important logic:

- `wrapStableCaptionText(text, maxLines, maxCharactersPerLine)`
  - preserves planner-provided newlines
  - defensively wraps plain text
  - returns at most two lines

- `renderCaptionText(...)`
  - renders each subtitle line with `whiteSpace: 'nowrap'`
  - prevents browser-created third lines

The component intentionally does not use `currentTime` to change text.

### `utils/subtitleRuntime.ts`

This file contains playback-time lookup logic for the active content script.

Important function:

- `findActiveCue(track, time, currentIndex, syncOffsetMs)`
  - finds the subtitle card whose interval contains the current media time
  - supports seeking by falling back to a full search when needed
  - uses media time, not wall-clock animation

### `utils/safeRootRenderer.tsx`

This safely owns React roots inside YouTube's constantly changing DOM.

Display responsibilities:

- creates React roots for injected overlay containers
- recreates roots if YouTube replaces the player DOM
- unmounts old roots safely

## Phrase-Card Planning

The phrase-card planner converts word-level or estimated timing units into stable display cards.

### `rendering/planning/SubtitlePhraseCardPlanner.ts`

This is the main phrase-card planner.

Default behavior:

- minimum card duration: `1_200 ms`
- preferred card duration: `2_400 ms`
- maximum card duration: `5_000 ms`
- preferred words per card: `9`
- maximum words per card: `14`
- maximum characters per line: `42`
- maximum lines: `2`
- silence boundary: `350 ms`

Important exports:

- `SubtitlePhraseCardPlanner`
  - accumulates timed text units into readable phrase cards
  - commits cards at sentence, silence, punctuation, capacity, or duration boundaries
  - validates that cards do not overlap or repeat large text prefixes

- `createEstimatedTimedTextUnits(...)`
  - estimates word timing inside cue-level subtitles
  - used when YouTube does not provide true word timing
  - timing is only used to determine phrase card boundaries

Important internal behavior:

1. Sort timed units by start time.
2. Add units to a `PhraseAccumulator`.
3. Classify the current boundary.
4. Decide whether the pending phrase should commit.
5. If line capacity is exceeded, backtrack to the best prior boundary.
6. Build one immutable `SubtitlePhraseCard`.
7. Rebalance tiny trailing cards.
8. Validate final cards.

### `rendering/planning/PhraseAccumulator.ts`

This accumulates pending timed text units before a card is committed.

Important snapshot fields:

- `text`
- `startMs`
- `endMs`
- `durationMs`
- `wordCount`
- `characterCount`
- `estimatedLines`

The planner uses snapshots to decide whether the pending phrase is readable.

### `rendering/planning/classifyPhraseBoundary.ts`

Classifies natural boundaries.

Priority:

1. sentence punctuation: `.`, `?`, `!`, `...`
2. silence gap of at least `350 ms`
3. clause punctuation: `,`, `;`, `:`, dash
4. no boundary

### `rendering/planning/shouldCommitPhraseCard.ts`

Decides whether a pending phrase becomes a card.

Commits when:

- line capacity is exceeded
- maximum words are reached
- maximum duration is reached
- a sentence ends
- a silence boundary appears after the minimum duration
- a clause boundary appears near preferred size or duration
- the source cue ends

Line capacity is checked before duration so the planner does not create a card that would need visual truncation.

### `rendering/planning/rebalancePhraseCards.ts`

Post-processes cards after planning.

Responsibilities:

- merge tiny cards when possible
- rebalance tiny trailing fragments
- move words and timing together when the final card would be too short
- preserve card order
- keep cards within the two-line/word-count constraints

This avoids bad output like a 500 ms card containing only `capitalism.`.

### `rendering/planning/joinCaptionUnits.ts`

Text utility functions.

Important functions:

- `joinCaptionUnits(units)`
  - joins text without bad punctuation spacing
  - produces `Hello, world.`
  - avoids `Hello , world .`

- `countReadingUnits(text)`
  - counts words for space-separated languages
  - counts characters for CJK text

- `estimateCaptionLines(text, maxChars)`
  - estimates how many lines a card needs

- `wrapCaptionText(text, maxChars, maxLines)`
  - wraps card text to the visual limits

### `rendering/planning/validatePhraseCards.ts`

Validation helpers.

Checks:

- no duplicate IDs
- valid start/end times
- no overlapping cards
- no large text overlap between adjacent cards

Important function:

- `hasLargeTextOverlap(previous, next)`
  - detects cumulative-window behavior
  - prevents card 2 from repeating most of card 1

## Display Domain Types

### `rendering/domain/SubtitlePhraseCard.ts`

Defines the stable phrase-card data model.

Important fields:

- `id`
- `parentCueIds`
- `startMs`
- `endMs`
- `originalText`
- `translatedText`
- `timingSource`
- `boundaryReason`
- `stable: true`

### `rendering/domain/SubtitlePhraseTrack.ts`

Defines a phrase-card track:

- video/session metadata
- source and target language
- card list
- duration
- planning version

## Compatibility Rendering Path

The repo also has a rendering service path under `rendering/*`. It is related to subtitle display and was updated so it uses phrase-card planning instead of rolling windows.

Important files:

- `rendering/planning/SubtitleDisplayPlanner.ts`
  - compatibility wrapper around `SubtitlePhraseCardPlanner`
  - returns `SubtitleDisplaySlice[]`
  - sets `cumulativeWindow: false`

- `rendering/planning/SubtitleDisplayPlannerOptions.ts`
  - maps old slice planner option names to phrase-card defaults

- `rendering/adapters/createSubtitleRenderTrack.ts`
  - builds display tracks from translation documents

- `rendering/scheduling/SubtitleScheduler.ts`
  - schedules active card changes
  - now rerenders on active-card changes, not every player event

- `rendering/scheduling/CueIndex.ts`
  - efficient active-card lookup

- `rendering/scheduling/findCueAtTime.ts`
  - binary search helper for media-time lookup

- `rendering/overlay/SubtitleOverlay.tsx`
  - overlay component used by the rendering service path

- `rendering/overlay/subtitleOverlay.css`
  - CSS for the rendering service overlay

## Removed/Disabled Behavior

The stable display path no longer uses:

- word-by-word reveal
- character reveal
- cumulative rolling windows
- appending text to the current visible subtitle
- `currentTime` inside the React overlay to mutate text
- one display card per word/timing unit

The old `rendering/planning/createRollingWindows.ts` helper was removed from the stable path.

The old `rollingSubtitleText` utility and test were removed from `utils/transcript.ts` and `tests/unit/transcript.test.ts`.

## Runtime Flow

The active display flow is:

```text
translated cue track
  -> createEstimatedTimedTextUnits()
  -> SubtitlePhraseCardPlanner.plan()
  -> stable phrase-card TranslatedSegment[]
  -> video timeupdate/seeking
  -> findActiveCue()
  -> renderOverlay()
  -> SubtitleOverlay
```

The viewer sees:

```text
Card 1 stays unchanged for its interval
Card 2 replaces Card 1 once at the boundary
Card 3 replaces Card 2 once at the boundary
```

The viewer does not see:

```text
"As"
"As a"
"As a conservative"
"As a conservative she"
```

## Tests Added/Updated

### `tests/rendering/SubtitleDisplayPlanner.test.ts`

Covers:

- long cues split into deterministic phrase cards
- no one-card-per-word behavior
- normal cards stay visible at least `1_200 ms`
- no large copied prefix between adjacent cards
- sentence boundaries are preferred
- scheduler does not rerender while the same card remains active
- scheduler changes once at the next card boundary

### `tests/component/SubtitleOverlay.test.tsx`

Covers:

- subtitle rendering
- status rendering
- style settings
- two-line rendering
- stable full-width caption panel
- no browser-created third line

### `tests/rendering/findCueAtTime.test.ts`

Covers media-time lookup behavior:

- inclusive cue start
- exclusive cue end
- gaps
- overlapping cue preference

## Verification Commands

The implementation was verified with:

```bash
npm run compile
npm test -- tests/rendering/SubtitleDisplayPlanner.test.ts tests/rendering/createSubtitleRenderTrack.test.ts tests/rendering/findCueAtTime.test.ts tests/component/SubtitleOverlay.test.tsx tests/unit/transcript.test.ts
npm run build
```

The production extension bundle is generated in:

```text
.output/chrome-mv3
```
