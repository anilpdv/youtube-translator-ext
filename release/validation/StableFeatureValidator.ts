import type { FeatureFlags } from '../../config/FeatureFlags';
export interface FeatureFlagViolation { readonly feature: keyof FeatureFlags; readonly message: string; }
const forbidden: readonly (keyof FeatureFlags)[] = [
  'transcriptDomFallback', 'liveCaptionTranslation', 'adaptiveTiming', 'transcriptPanel',
  'inPlayerToolbar', 'localOllama', 'chromeBuiltinAI', 'automaticTranslation',
  'automaticProviderFallback', 'automaticModelFallback',
];
export function validateStableFeatureFlags(flags: FeatureFlags): readonly FeatureFlagViolation[] {
  return forbidden.filter((feature) => flags[feature] === true).map((feature) => ({
    feature, message: `Experimental feature "${feature}" must be disabled in stable builds.`,
  }));
}
