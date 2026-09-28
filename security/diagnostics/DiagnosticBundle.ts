export interface DiagnosticBundle {
  readonly version: 1;
  readonly generatedAt: number;
  readonly appVersion: string;
  readonly details: Readonly<Record<string, unknown>>;
}
