export interface FeatureFlags {
  readonly popupWorkflow: boolean;
  readonly standardCaptionExtraction: boolean;
  readonly translationCache: boolean;
  readonly translatedSrtExport: boolean;
  readonly diagnosticsExport: boolean;
  readonly transcriptDomFallback: boolean;
  readonly liveCaptionTranslation: boolean;
  readonly adaptiveTiming: boolean;
  readonly transcriptPanel: boolean;
  readonly inPlayerToolbar: boolean;
  readonly localOllama: boolean;
  readonly chromeBuiltinAI: boolean;
  readonly automaticTranslation: boolean;
  readonly automaticCachedRendering: boolean;
  readonly automaticCaptionLoading: boolean;
  readonly automaticProviderFallback: boolean;
  readonly automaticModelFallback: boolean;
  readonly betaFeedback?: boolean;
  readonly additionalDiagnostics?: boolean;
}
