import { ApplicationController } from '../app/ApplicationController';
import { CaptionTrackDiscovery } from '../captions/discovery/CaptionTrackDiscovery';
import { PagePlayerDataReader } from '../captions/discovery/YouTubePlayerDataReader';
import { CaptionFetcher } from '../captions/fetching/CaptionFetcher';
import { DEFAULT_CAPTION_LIMITS } from '../captions/domain/CaptionLimits';
import { CaptionParserRegistry } from '../captions/parsing/CaptionParserRegistry';
import { Json3CaptionParser } from '../captions/parsing/Json3CaptionParser';
import { WebVttCaptionParser } from '../captions/parsing/WebVttCaptionParser';
import { BrowserCaptionTextDecoder } from '../captions/normalization/decodeCaptionText';
import { CaptionNormalizer } from '../captions/normalization/CaptionNormalizer';
import { CaptionValidator } from '../captions/validation/CaptionValidator';
import { CaptionExtractionService } from '../captions/service/CaptionExtractionService';
import { BackgroundTranslationProvider } from './BackgroundTranslationProvider';
import { TranslationService } from '../translation/service/TranslationService';
import { TranslationBatcher } from '../translation/batching/TranslationBatcher';
import { DEFAULT_TRANSLATION_LIMITS } from '../translation/domain/TranslationLimits';
import { TranslationResponseParser } from '../translation/validation/TranslationResponseParser';
import { TranslationResponseValidator } from '../translation/validation/TranslationResponseValidator';
import { TranslationCoordinator } from '../translation/execution/TranslationCoordinator';
import { RetryPolicy } from '../translation/execution/RetryPolicy';
import { TRANSLATION_PROMPT_VERSION } from '../translation/prompts/TranslationPromptVersion';
import { SubtitleRenderingService } from '../rendering/service/SubtitleRenderingService';
import { getSettings } from '../settings/BrowserSettingsRepository';
import type { ExtensionSettings } from '../settings/ExtensionSettings';

export async function createContentApplication(): Promise<ApplicationController> {
  const storedSettings: ExtensionSettings = await getSettings();
  // Provider credentials stay in the background worker. The content runtime
  // only receives non-sensitive workflow and display settings.
  const settings: ExtensionSettings = {
    ...storedSettings,
    apiKey: '',
  };
  const discovery = new CaptionTrackDiscovery(new PagePlayerDataReader());
  const captionExtraction = new CaptionExtractionService(
    discovery,
    new CaptionFetcher({ timeoutMs: 30_000, limits: DEFAULT_CAPTION_LIMITS }),
    new CaptionParserRegistry([new Json3CaptionParser(), new WebVttCaptionParser()]),
    new CaptionNormalizer(new BrowserCaptionTextDecoder(), {
      limits: DEFAULT_CAPTION_LIMITS,
      defaultDurationMs: 3_000,
      minimumDurationMs: 100,
    }),
    new CaptionValidator(DEFAULT_CAPTION_LIMITS),
  );
  const provider = new BackgroundTranslationProvider();
  const batcher = new TranslationBatcher(DEFAULT_TRANSLATION_LIMITS);
  const parser = new TranslationResponseParser();
  const validator = new TranslationResponseValidator(DEFAULT_TRANSLATION_LIMITS);
  const translation = new TranslationService(
    new Map([[provider.id, provider]]),
    { create: (selected) => new TranslationCoordinator(
      selected,
      batcher,
      parser,
      validator,
      new RetryPolicy(DEFAULT_TRANSLATION_LIMITS.maxAttemptsPerBatch),
      { promptVersion: TRANSLATION_PROMPT_VERSION, limits: DEFAULT_TRANSLATION_LIMITS },
    ) },
  );
  return new ApplicationController(settings, {
    captionExtraction,
    translation,
    rendering: new SubtitleRenderingService(),
  });
}
