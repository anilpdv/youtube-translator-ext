import { validateStableFeatureFlags } from './StableFeatureValidator';
import type { FeatureFlags } from '../../config/FeatureFlags';
export function validateStablePackage(input: { readonly manifest: Record<string, unknown>; readonly featureFlags: FeatureFlags }): readonly string[] {
  const errors = validateStableFeatureFlags(input.featureFlags).map((violation) => violation.message);
  if (typeof input.manifest.version !== 'string') errors.push('Package manifest is missing a version.');
  if (!Array.isArray(input.manifest.permissions)) errors.push('Package manifest permissions are missing.');
  return errors;
}
