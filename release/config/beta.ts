import { stableFeatureFlags } from './stable';
export const betaFeatureFlags = { ...stableFeatureFlags, betaFeedback: true, additionalDiagnostics: true };
