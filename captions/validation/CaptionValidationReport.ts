export type CaptionValidationSeverity = 'warning' | 'error';

export interface CaptionValidationIssue {
  readonly code: string;
  readonly severity: CaptionValidationSeverity;
  readonly message: string;
  readonly cueIndex?: number;
}

export interface CaptionValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CaptionValidationIssue[];
  readonly cueCount: number;
  readonly textLength: number;
  readonly durationMs: number;
  readonly overlapCount: number;
}
