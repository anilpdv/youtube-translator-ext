import type { CaptionCue } from '../domain/CaptionCue';
import { extractRollingDelta } from './extractRollingDelta';

export interface RollingCaptionPolicy {
  readonly maximumGapMs: number;
  readonly minimumOverlapTokens: number;
  readonly minimumOverlapRatio: number;
  readonly maximumHistoryCues: number;
}
export const DEFAULT_ROLLING_CAPTION_POLICY: RollingCaptionPolicy = {
  maximumGapMs: 1_500, minimumOverlapTokens: 2,
  minimumOverlapRatio: 0.35, maximumHistoryCues: 5,
};

export class RollingCaptionNormalizer {
  constructor(private readonly policy = DEFAULT_ROLLING_CAPTION_POLICY) {}

  normalize(cues: readonly CaptionCue[], languageCode: string): readonly CaptionCue[] {
    if (cues.length < 2) return cues;
    const output: CaptionCue[] = [];
    let previousVisibleText = '';
    let previousEndMs = -1;
    for (const cue of cues) {
      if (previousEndMs >= 0 && cue.startMs - previousEndMs > this.policy.maximumGapMs) {
        previousVisibleText = '';
      }
      if (!previousVisibleText) {
        output.push(cue);
      } else {
        const delta = extractRollingDelta(previousVisibleText, cue.text, languageCode);
        const rolling = delta.overlapTokenCount >= this.policy.minimumOverlapTokens &&
          delta.overlapRatio >= this.policy.minimumOverlapRatio;
        if (delta.relationship !== 'same') {
          output.push(rolling && delta.text ? {
            ...cue, id: `${cue.id}:delta`, text: delta.text,
            sourceBehavior: 'rolling', timingUnits: [],
          } : cue);
        }
      }
      previousVisibleText = cue.text;
      previousEndMs = cue.endMs;
    }
    return output;
  }
}
