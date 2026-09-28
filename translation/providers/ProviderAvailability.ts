export type ProviderAvailabilityStatus =
  | 'available'
  | 'missing-credentials'
  | 'unavailable'
  | 'unsupported';

export interface ProviderAvailability {
  readonly status: ProviderAvailabilityStatus;
  readonly message: string;
  readonly modelIds: readonly string[];
}
