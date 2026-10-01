import type { TranslationDocument } from '../../translation/domain/TranslationDocument';
import { RenderingError } from '../domain/RenderingError';
import type { SubtitleDisplaySlice } from '../domain/SubtitleDisplaySlice';
import type { SubtitleDisplayTrack } from '../domain/SubtitleDisplayTrack';
import { SubtitleDisplayPlanner } from '../planning/SubtitleDisplayPlanner';
import { DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS } from '../planning/SubtitleDisplayPlannerOptions';
import { DISPLAY_PLANNING_VERSION } from '../planning/DisplayPlanningVersion';

export function createSubtitleDisplayTrack(document: TranslationDocument, planner = new SubtitleDisplayPlanner(DEFAULT_SUBTITLE_DISPLAY_PLANNER_OPTIONS)): SubtitleDisplayTrack {
  if (document.videoId !== document.source.videoId) throw new RenderingError({ code: 'TRACK_VIDEO_MISMATCH', message: 'The translation and caption document belong to different videos.' });
  const slices: SubtitleDisplaySlice[] = [];
  for (const sourceCue of document.source.cues) {
    for (const planned of planner.plan({ sourceCue, translatedCues: document.cues.filter((cue) => (cue.parentCueId ?? cue.id) === sourceCue.id), sourceLanguage: document.sourceLanguage, targetLanguage: document.targetLanguage })) {
      const previous = slices.at(-1);
      const startMs = Math.max(planned.startMs, previous?.endMs ?? 0);
      if (planned.endMs > startMs) slices.push({ ...planned, startMs });
    }
  }
  let previousEnd = -1; const ids = new Set<string>();
  for (const slice of slices) {
    if (!slice.id || ids.has(slice.id) || slice.endMs <= slice.startMs || slice.startMs < previousEnd) throw new RenderingError({ code: 'INVALID_RENDER_TRACK', message: 'The subtitle display plan is invalid.' });
    ids.add(slice.id); previousEnd = slice.endMs;
  }
  return { sessionId: document.sessionId, videoId: document.videoId, sourceLanguage: document.sourceLanguage, targetLanguage: document.targetLanguage, slices, durationMs: document.source.durationMs, planningVersion: DISPLAY_PLANNING_VERSION };
}
export const createSubtitleRenderTrack = createSubtitleDisplayTrack;
