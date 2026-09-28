import type { CaptionCue } from '../domain/CaptionCue';
import type { CaptionLimits } from '../domain/CaptionLimits';
import type {
  CaptionValidationIssue,
  CaptionValidationReport,
} from './CaptionValidationReport';

export class CaptionValidator {
  constructor(private readonly limits: CaptionLimits) {}

  validate(cues: readonly CaptionCue[]): CaptionValidationReport {
    const issues: CaptionValidationIssue[] = [];
    let textLength = 0;
    let durationMs = 0;
    let overlapCount = 0;
    if (cues.length === 0) {
      issues.push({
        code: 'EMPTY_TRACK',
        severity: 'error',
        message: 'The caption track contains no cues.',
      });
    }
    if (cues.length > this.limits.maxCueCount) {
      issues.push({
        code: 'CUE_LIMIT_EXCEEDED',
        severity: 'error',
        message: 'The caption track contains too many cues.',
      });
    }
    for (let index = 0; index < cues.length; index += 1) {
      const cue = cues[index];
      textLength += cue.text.length;
      durationMs = Math.max(durationMs, cue.endMs);
      if (!Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs)) {
        issues.push({
          code: 'NON_FINITE_TIMESTAMP',
          severity: 'error',
          message: 'A caption cue has an invalid timestamp.',
          cueIndex: index,
        });
      }
      if (cue.startMs < 0) {
        issues.push({
          code: 'NEGATIVE_START',
          severity: 'error',
          message: 'A caption cue begins before zero.',
          cueIndex: index,
        });
      }
      if (cue.endMs <= cue.startMs) {
        issues.push({
          code: 'INVALID_DURATION',
          severity: 'error',
          message: 'A caption cue has a non-positive duration.',
          cueIndex: index,
        });
      }
      if (!cue.text.trim()) {
        issues.push({
          code: 'EMPTY_TEXT',
          severity: 'error',
          message: 'A caption cue contains no text.',
          cueIndex: index,
        });
      }
      if (cue.text.length > this.limits.maxCueTextLength) {
        issues.push({
          code: 'CUE_TEXT_TOO_LONG',
          severity: 'error',
          message: 'A caption cue exceeds the allowed text length.',
          cueIndex: index,
        });
      }
      const previous = cues[index - 1];
      if (!previous) continue;
      if (cue.startMs < previous.startMs) {
        issues.push({
          code: 'OUT_OF_ORDER',
          severity: 'error',
          message: 'Caption cues are not ordered by start time.',
          cueIndex: index,
        });
      }
      if (cue.startMs < previous.endMs) {
        overlapCount += 1;
        const overlapMs = previous.endMs - cue.startMs;
        issues.push({
          code: 'OVERLAPPING_CUES',
          severity: overlapMs > this.limits.maxOverlapMs ? 'error' : 'warning',
          message: `Caption cues overlap by ${overlapMs}ms.`,
          cueIndex: index,
        });
      }
    }
    if (textLength > this.limits.maxTotalTextLength) {
      issues.push({
        code: 'TEXT_LIMIT_EXCEEDED',
        severity: 'error',
        message: 'The complete caption track exceeds the allowed text size.',
      });
    }
    if (durationMs > this.limits.maxTrackDurationMs) {
      issues.push({
        code: 'DURATION_LIMIT_EXCEEDED',
        severity: 'error',
        message: 'The caption track exceeds the allowed duration.',
      });
    }
    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
      cueCount: cues.length,
      textLength,
      durationMs,
      overlapCount,
    };
  }
}
