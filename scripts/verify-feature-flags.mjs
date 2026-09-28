const channel = process.argv[2] ?? process.env.RELEASE_CHANNEL ?? 'stable';
const stableForbidden = ['transcriptDomFallback', 'liveCaptionTranslation', 'adaptiveTiming', 'transcriptPanel', 'inPlayerToolbar', 'localOllama', 'chromeBuiltinAI', 'automaticTranslation', 'automaticProviderFallback', 'automaticModelFallback'];
if (channel === 'stable' && stableForbidden.some((feature) => process.env[`FEATURE_${feature}`] === 'true')) {
  throw new Error('Forbidden stable feature flag is enabled.');
}
console.log(`Feature flags verified for ${channel}.`);
