import { betaFeatureFlags } from './beta';
export const developmentFeatureFlags = { ...betaFeatureFlags, transcriptDomFallback: true, additionalDiagnostics: true };
