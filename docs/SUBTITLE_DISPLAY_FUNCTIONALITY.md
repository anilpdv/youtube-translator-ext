# Subtitle display functionality

This document describes the single subtitle display path used by the packaged
extension. It covers extraction handoff, phrase-card planning, translation
mapping, media-time scheduling, and the overlay. Translation starts only after
the user presses the popup or in-player Translate button for the current video.

## Runtime path

```text
entrypoints/content.tsx
  -> content/createContentApplication.ts
  -> ApplicationController
  -> CaptionExtractionService
  -> TranslationService / BackgroundTranslationProvider
  -> TranslationDocument
  -> SubtitleRenderingService
  -> createSubtitleDisplayTrack
  -> SubtitleScheduler
  -> OverlayController
  -> rendering/overlay/SubtitleOverlay.tsx
```

The popup uses `PopupController` and `PopupRuntimeClient`. It sends commands to
the content application through the validated background message protocol; it
does not translate directly.

The background owns provider credentials. The content script sends phrase-card
IDs and source text, never API keys. Stable V1 has one provider path: Gemini
with the selected model. It does not silently switch to another provider.

## Activation and navigation

`entrypoints/content.tsx` is a composition root. It creates the domain
application, registers the message handler, starts it, and disposes it on
teardown. Navigation creates a new session and clears the prior activation.

The runtime keeps explicit per-video activation state. Loading a page, opening
the popup, loading settings, or finding a cache entry cannot start translation.
The first explicit start command authorizes exactly one workflow for that video.
Toggling an already translated track only changes visibility and does not write
an automatic-translation preference.

The extension does not click, enable, disable, or hide YouTube's native CC
button. Caption extraction uses timed-text data from the caption track.

## Source phrase-card planning

`translation/adapters/createTranslationPhraseCards.ts` is the only active
translation planning adapter. It runs once before provider translation, once
per source cue:

1. Use exact JSON3/WebVTT timing units when available.
2. Estimate word timing inside the source cue only when exact units are absent.
3. Feed those units to `SubtitlePhraseCardPlanner`.
4. Preserve each card ID, parent cue ID, source text, and media interval.
5. Send those cards directly to the translation batcher.

`SubtitlePhraseCardPlanner` creates immutable, non-cumulative cards. Its default
limits are:

- minimum duration: 1,200 ms
- preferred duration: 2,400 ms
- maximum duration: 5,000 ms
- preferred words: 9
- maximum words: 14
- maximum characters per line: 42
- maximum lines: 2
- silence boundary: 350 ms

Sentence boundaries are preferred, followed by silence, clause punctuation,
line capacity, duration, and a word-boundary fallback. If a new unit would
exceed two lines or the word limit, the planner backtracks to the latest
natural boundary before committing. Cards never cross parent source cues.

`PhraseAccumulator` preserves the complete pending text and timing. Joining
units keeps punctuation spacing correct (`Hello, world.` rather than
`Hello , world .`). `rebalancePhraseCards` merges or rebalances tiny trailing
cards without manufacturing translated text. `validatePhraseCards` rejects
overlong, overlapping, duplicate, or truncated cards.

There is no typewriter effect, word reveal, character reveal, rolling window, or
cumulative prefix progression in the stable prerecorded path. Fine-grained
timing determines card boundaries; it does not rewrite the visible caption for
each word.

## Translation contract

`TranslationBatcher` consumes the planned phrase cards directly. The batching
version is `batching-v3-stable-phrase-cards`, which invalidates incompatible
progressive-slice cache entries.

`TranslationPromptBuilder` requires exactly one JSON result for every phrase
ID. Providers must preserve IDs, cannot split or combine cards, and cannot
translate context fields. `TranslationResponseValidator` rejects missing,
duplicate, unknown, empty, or extra IDs. Neighboring phrase text is context
only.

## Display track

`rendering/adapters/createSubtitleRenderTrack.ts` maps translated phrase cues
directly to `SubtitleDisplaySlice` records. It does not plan, wrap, split, or
re-time translated text. `cumulativeWindow` is always `false`.

When translation is partial, uncovered source cues are retained as
untranslated fallback slices. This keeps source text visible without changing
the translated phrase-card timeline. The adapter validates video identity,
unique IDs, positive timing, and non-overlapping slices.

## Scheduling and rendering

`SubtitleScheduler` uses `video.currentTime` as media time. It binary-searches
the immutable display track, emits only when the active card or playback state
changes, and handles seeking and playback-rate changes. Pausing clears future
wake timers and freezes the current card. Seeking selects the matching whole
card immediately; it does not replay earlier words.

`SubtitleRenderingService` owns the render track and player lifecycle.
`OverlayController` mounts `rendering/overlay/SubtitleOverlay.tsx` in the
YouTube player. The overlay receives one complete card and does not mutate it
while its interval is active.

The overlay uses non-destructive wrapping: `pre-wrap`, visible overflow, and
normal word boundaries. No line clamp, hidden overflow, `nowrap`, or array
slicing is used to delete text. The planner is responsible for producing cards
that fit two lines; validation catches a planner failure instead of hiding the
extra text.

## Relevant files

### Active runtime

- `entrypoints/content.tsx`
- `content/createContentApplication.ts`
- `content/BackgroundTranslationProvider.ts`
- `app/ApplicationController.ts`
- `captions/service/CaptionExtractionService.ts`
- `translation/adapters/createTranslationPhraseCards.ts`
- `translation/batching/TranslationBatcher.ts`
- `translation/execution/TranslationCoordinator.ts`
- `background/TranslationGateway.ts`
- `rendering/adapters/createSubtitleRenderTrack.ts`
- `rendering/service/SubtitleRenderingService.ts`
- `rendering/scheduling/SubtitleScheduler.ts`
- `rendering/overlay/SubtitleOverlay.tsx`
- `rendering/overlay/subtitleOverlay.css`
- `rendering/overlay/OverlayController.ts`
- `entrypoints/popup/App.tsx`
- `popup/app/PopupController.ts`
- `popup/runtime/PopupRuntimeClient.ts`
- `settings/ExtensionSettings.ts`
- `settings/DefaultSettings.ts`
- `settings/BrowserSettingsRepository.ts`

### Planning and validation

- `rendering/planning/SubtitlePhraseCardPlanner.ts`
- `rendering/planning/PhraseAccumulator.ts`
- `rendering/planning/classifyPhraseBoundary.ts`
- `rendering/planning/shouldCommitPhraseCard.ts`
- `rendering/planning/rebalancePhraseCards.ts`
- `rendering/planning/joinCaptionUnits.ts`
- `rendering/planning/validatePhraseCards.ts`
- `captions/parsers/Json3CaptionParser.ts`
- `captions/domain/CaptionTimingUnit.ts`
- `translation/validation/TranslationResponseValidator.ts`

The active path has one planner, one scheduler, one overlay, and one provider
route. Legacy runtime files and legacy-only tests have been removed.
