import type { TranslationDocument } from '../../translation/domain/TranslationDocument';
import { RenderingError } from '../domain/RenderingError';
import type { SubtitleRenderCue } from '../domain/SubtitleRenderCue';
import type { SubtitleRenderTrack } from '../domain/SubtitleRenderTrack';

export function createSubtitleRenderTrack(
  document: TranslationDocument,
): SubtitleRenderTrack {
  if (document.videoId !== document.source.videoId) {
    throw new RenderingError({
      code: 'TRACK_VIDEO_MISMATCH',
      message: 'The translation and caption document belong to different videos.',
    });
  }
  const translations = new Map(document.cues.map((cue) => [cue.id, cue]));
  const cues: SubtitleRenderCue[] = document.source.cues.map((sourceCue) => {
    const translated = translations.get(sourceCue.id);
    return {
      id: sourceCue.id,
      startMs: sourceCue.startMs,
      endMs: sourceCue.endMs,
      originalText: sourceCue.text,
      translatedText: translated?.translatedText ?? null,
      sourceLanguage: document.sourceLanguage,
      targetLanguage: document.targetLanguage,
    };
  });
  validateRenderCues(cues);
  return {
    sessionId: document.sessionId,
    videoId: document.videoId,
    sourceLanguage: document.sourceLanguage,
    targetLanguage: document.targetLanguage,
    cues,
    durationMs: document.source.durationMs,
    completed: document.completion === 'complete',
  };
}

function validateRenderCues(cues: readonly SubtitleRenderCue[]): void {
  let previousStart = -1;
  const ids = new Set<string>();
  for (const [index, cue] of cues.entries()) {
    if (
      !cue.id ||
      ids.has(cue.id) ||
      !Number.isFinite(cue.startMs) ||
      !Number.isFinite(cue.endMs) ||
      cue.endMs <= cue.startMs
    ) {
      throw new RenderingError({
        code: 'INVALID_RENDER_TRACK',
        message: 'The subtitle track contains an invalid cue.',
        details: { cueId: cue.id, cueIndex: index },
      });
    }
    if (cue.startMs < previousStart) {
      throw new RenderingError({
        code: 'INVALID_RENDER_TRACK',
        message: 'The subtitle track is not ordered.',
        details: { cueId: cue.id, cueIndex: index },
      });
    }
    ids.add(cue.id);
    previousStart = cue.startMs;
  }
}
