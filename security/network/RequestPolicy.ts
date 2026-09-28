export interface RequestPolicy {
  readonly allowedOrigins: readonly string[];
  readonly allowedMethods: readonly string[];
  readonly timeoutMs: number;
  readonly maxRequestBytes: number;
  readonly maxResponseBytes: number;
  readonly allowRedirects: boolean;
  readonly maximumRedirects: number;
}
