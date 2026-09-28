import type { FeatureFlags } from '../../config/FeatureFlags';
export const stableFeatureFlags: FeatureFlags = {
  popupWorkflow: true, standardCaptionExtraction: true, translationCache: true,
  translatedSrtExport: true, diagnosticsExport: true, transcriptDomFallback: false,
  liveCaptionTranslation: false, adaptiveTiming: false, transcriptPanel: false,
  inPlayerToolbar: false, localOllama: false, chromeBuiltinAI: false,
  automaticTranslation: false, automaticProviderFallback: false, automaticModelFallback: false,
};
