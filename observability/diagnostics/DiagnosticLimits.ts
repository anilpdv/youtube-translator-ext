export interface DiagnosticLimits {
  readonly maxEventCount: number;
  readonly maxEventAgeMs: number;
  readonly maxEventBytes: number;
  readonly maxBundleBytes: number;
}
export const DEFAULT_DIAGNOSTIC_LIMITS: DiagnosticLimits = {
  maxEventCount: 2000, maxEventAgeMs: 7 * 24 * 60 * 60 * 1000,
  maxEventBytes: 16 * 1024, maxBundleBytes: 2 * 1024 * 1024,
};
