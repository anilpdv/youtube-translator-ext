import type { BuildChannel } from '../domain/BuildChannel';
import type { FeatureFlags } from '../../config/FeatureFlags';
import { parseReleaseVersion } from '../domain/ReleaseVersion';
import { validateStableFeatureFlags } from './StableFeatureValidator';
export interface ReleaseValidationInput { readonly version: string; readonly channel: BuildChannel; readonly featureFlags: FeatureFlags; }
export function validateRelease(input: ReleaseValidationInput): readonly string[] {
  const errors: string[] = [];
  try { parseReleaseVersion(input.version); } catch (error) { errors.push(error instanceof Error ? error.message : 'Invalid version.'); }
  if (input.channel === 'stable') errors.push(...validateStableFeatureFlags(input.featureFlags).map((violation) => violation.message));
  return errors;
}
