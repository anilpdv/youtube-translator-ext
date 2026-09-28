export type MetricKind = 'counter' | 'gauge' | 'histogram';
export interface MetricEvent {
  readonly metricName: string;
  readonly kind: MetricKind;
  readonly value: number;
  readonly timestamp: number;
  readonly labels: Readonly<Record<string, string>>;
}
