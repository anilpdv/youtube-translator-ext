export interface CompatibilityResult {
  readonly browser: string;
  readonly operatingSystem: string;
  readonly scenario: string;
  readonly passed: boolean;
  readonly checkedAt: number;
  readonly notes?: string;
}
