import type { TranslationDocument } from '../../translation/domain/TranslationDocument';
import { RenderingError } from '../domain/RenderingError';
import type { SubtitleDisplaySlice } from '../domain/SubtitleDisplaySlice';
import type { SubtitleDisplayTrack } from '../domain/SubtitleDisplayTrack';
import { DISPLAY_PLANNING_VERSION } from '../planning/DisplayPlanningVersion';

export function createSubtitleDisplayTrack(document: TranslationDocument): SubtitleDisplayTrack {
  if (document.videoId !== document.source.videoId) {
    throw new RenderingError({
      code: 'TRACK_VIDEO_MISMATCH',
      message: 'The translation and caption document belong to different videos.',
    });
  }
  // Translation may be partial while batches are still completing. Preserve
  // uncovered source cues as untranslated display slices so the renderer does
  // not silently remove source text. A translated phrase card covers its
  // parent cue and must never be planned or split again here.
  const coveredSourceCueIds = new Set<string>();
  const translatedSlices: SubtitleDisplaySlice[] = document.cues.map((cue, index) => {
    const parentCueId = cue.parentCueId ?? cue.id;
    coveredSourceCueIds.add(parentCueId);
    coveredSourceCueIds.add(cue.id);
    return {
      id: cue.id,
      parentCueId,
      sliceIndex: cue.sliceIndex ?? index,
      startMs: cue.startMs,
      endMs: cue.endMs,
      originalText: cue.sourceText,
      translatedText: cue.translatedText || null,
      sourceLanguage: document.sourceLanguage,
      targetLanguage: document.targetLanguage,
      timingSource: cue.timingSource ?? 'estimated',
      cumulativeWindow: false,
    };
  });
  const fallbackSlices: SubtitleDisplaySlice[] = document.source.cues
    .filter((cue) => !coveredSourceCueIds.has(cue.id))
    .map((cue, index) => ({
      id: `source:${cue.id}`,
      parentCueId: cue.id,
      sliceIndex: index,
      startMs: cue.startMs,
      endMs: cue.endMs,
      originalText: cue.text,
      translatedText: null,
      sourceLanguage: document.sourceLanguage,
      targetLanguage: document.targetLanguage,
      timingSource: cue.timingUnits?.length ? 'word-timing' : 'cue-timing',
      cumulativeWindow: false,
    }));
  const slices = [...translatedSlices, ...fallbackSlices].sort(
    (left, right) => left.startMs - right.startMs || left.endMs - right.endMs,
  );
  let previousEnd = -1;
  const ids = new Set<string>();
  for (const slice of slices) {
    if (!slice.id || ids.has(slice.id) || slice.endMs <= slice.startMs || slice.startMs < previousEnd) {
      throw new RenderingError({ code: 'INVALID_RENDER_TRACK', message: 'The subtitle display track is invalid.' });
    }
    ids.add(slice.id);
    previousEnd = slice.endMs;
  }
  return {
    sessionId: document.sessionId,
    videoId: document.videoId,
    sourceLanguage: document.sourceLanguage,
    targetLanguage: document.targetLanguage,
    slices,
    durationMs: document.source.durationMs,
    planningVersion: DISPLAY_PLANNING_VERSION,
  };
}
export const createSubtitleRenderTrack = createSubtitleDisplayTrack;
