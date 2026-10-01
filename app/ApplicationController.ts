import type { ExtensionSettings } from '../settings/ExtensionSettings';
import { ApplicationError } from './ApplicationError';
import { DisposableStack } from '../runtime/DisposableStack';
import { SessionGuard } from '../runtime/SessionGuard';
import {
  NavigationController,
  type NavigationChange,
} from '../youtube/NavigationController';
import { createInitialState } from './createInitialState';
import { SessionStore } from './SessionStore';
import { TranslationSession, type TranslationSessionOptions } from './TranslationSession';
import type { CaptionDocument } from '../captions/domain/CaptionDocument';
import type { CaptionTrack } from '../captions/domain/CaptionTrack';
import type { CaptionExtractionService } from '../captions/service/CaptionExtractionService';
import type { TrackSelectionPreferences } from '../captions/discovery/selectCaptionTrack';
import { mapCaptionError } from '../captions/service/mapCaptionError';
import type { TranslationDocument } from '../translation/domain/TranslationDocument';
import type { TranslationProgressListener } from '../translation/domain/TranslationProgress';
import type { TranslationService } from '../translation/service/TranslationService';
import { mapTranslationError } from '../translation/service/mapTranslationError';
import type { SubtitleDisplaySettings } from '../rendering/domain/SubtitleDisplaySettings';
import {
  sanitizeSubtitleDisplaySettings,
} from '../rendering/domain/SubtitleDisplaySettings';
import type { SubtitleRenderingService } from '../rendering/service/SubtitleRenderingService';
import { RenderingError } from '../rendering/domain/RenderingError';
import type { PopupStateContext } from '../popup/app/createPopupState';
import type { TranslationActivationSource } from './SessionState';

export interface ApplicationDependencies {
  readonly captionExtraction?: CaptionExtractionService;
  readonly translation?: TranslationService;
  readonly rendering?: SubtitleRenderingService;
}

export interface StartTranslationOptions
  extends Omit<TranslationSessionOptions, 'id'> {}

export class ApplicationController {
  readonly store: SessionStore;

  private readonly resources = new DisposableStack();
  private readonly sessions = new SessionGuard();
  private readonly navigation: NavigationController;
  private started = false;

  constructor(
    private readonly settings: ExtensionSettings,
    private readonly dependencies: ApplicationDependencies = {},
  ) {
    this.store = new SessionStore(
      createInitialState({ subtitlesEnabled: false }),
    );
    this.navigation = new NavigationController({
      onNavigationStart: this.handleNavigationStart,
      onVideoChanged: this.handleVideoChanged,
    });
    this.resources.add(this.navigation);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.navigation.start();

    const videoId = this.navigation.getCurrentVideoId();
    this.store.update({
      videoId,
      message: videoId
        ? 'Video detected. Open the extension to translate subtitles.'
        : 'Open a supported YouTube video.',
    });
  }

  async dispose(): Promise<void> {
    this.sessions.cancelActive('Application disposed');
    await this.resources.dispose();

    const status = this.store.getSnapshot().status;
    if (status !== 'cancelled' && status !== 'failed') {
      this.store.transition('cancelled', {
        message: 'Subtitle session stopped.',
        sessionId: null,
      });
    }
    this.started = false;
  }

  createTranslationSession(
    options: StartTranslationOptions,
  ): TranslationSession {
    const session = new TranslationSession(options);
    this.sessions.start(session);
    this.store.update({
      sessionId: session.id,
      videoId: session.videoId,
      error: null,
      message: 'Preparing subtitle translation.',
      sourceTrack: [],
      translatedTrack: [],
      progress: {
        completedBatches: 0,
        failedBatches: 0,
        totalBatches: 0,
        completedCues: 0,
        failedCues: 0,
        totalCues: 0,
        currentAttempt: 0,
      },
    });
    return session;
  }

  async translateCaptions(
    session: TranslationSession,
    captionDocument: CaptionDocument,
  ): Promise<TranslationDocument> {
    this.assertTranslationRequested();
    this.assertSessionCurrent(session.id);
    const translation = this.dependencies.translation;
    if (!translation) {
      throw new Error('Translation is not configured.');
    }

    if (!session.modelId) {
      throw new Error('A translation model must be selected explicitly.');
    }

    this.store.transition('preparing-translation', {
      message: 'Preparing subtitle translation.',
      error: null,
      translationDocument: null,
      batchResults: [],
    });
    this.store.transition('translating', {
      message: 'Translating subtitles.',
    });
    const onProgress: TranslationProgressListener = (progress) => {
      if (!this.isSessionCurrent(session.id)) return;
      this.store.update({
        progress: {
          completedBatches: progress.completedBatches,
          failedBatches: progress.failedBatches,
          totalBatches: progress.totalBatches,
          completedCues: progress.translatedCues,
          failedCues: progress.failedCues,
          totalCues: progress.totalCues,
          currentAttempt: progress.currentAttempt ?? 0,
        },
      });
    };
    try {
      const result = await translation.translate(
        {
          sessionId: session.id,
          videoId: session.videoId,
          sourceLanguage:
            session.sourceLanguage ??
            captionDocument.track.languageCode,
          targetLanguage: session.targetLanguage,
          providerId: session.providerId,
          modelId: session.modelId,
          captionDocument,
          signal: session.signal,
        },
        onProgress,
      );
      this.assertSessionCurrent(session.id);
      this.store.transition(
        result.completion === 'complete'
          ? 'completed'
          : 'partially-completed',
        {
          translationDocument: result,
          batchResults: result.batchResults,
          translatedTrack: result.cues,
          progress: {
            completedCues: result.translatedCueCount,
            failedCues: result.failedCueCount,
            totalCues: result.source.cues.length,
          },
          message:
            result.completion === 'complete'
              ? 'Subtitle translation completed.'
              : 'Translation completed with some failed sections.',
        },
      );
      return result;
    } catch (error) {
      if (!this.isSessionCurrent(session.id)) throw error;
      const mapped = mapTranslationError(error);
      this.store.transition(
        mapped.code === 'SESSION_CANCELLED' ? 'cancelled' : 'failed',
        { message: mapped.message, error: mapped },
      );
      throw mapped;
    }
  }

  async showTranslatedSubtitles(
    session: TranslationSession,
    document: TranslationDocument,
  ): Promise<void> {
    this.assertTranslationRequested();
    this.assertSessionCurrent(session.id);
    const rendering = this.dependencies.rendering;
    if (!rendering) throw new Error('Rendering is not configured.');
    if (document.sessionId !== session.id || document.videoId !== session.videoId) {
      throw new RenderingError({
        code: 'TRACK_VIDEO_MISMATCH',
        message: 'The translated subtitles belong to another video or session.',
      });
    }
    try {
      await rendering.show(document, this.store.getSnapshot().subtitleDisplay);
      this.assertSessionCurrent(session.id);
      this.store.update({
        subtitlesEnabled: true,
        renderingActive: true,
        message:
          document.completion === 'complete'
            ? 'Translated subtitles are active.'
            : 'Translated subtitles are active with some untranslated sections.',
      });
    } catch (error) {
      if (!this.isSessionCurrent(session.id)) return;
      const mapped = new ApplicationError({
        code: 'RENDERING_FAILED',
        title: 'Subtitles cannot be displayed',
        message: error instanceof Error ? error.message : 'Subtitle rendering failed.',
        retryable: error instanceof RenderingError ? error.retryable : true,
        cause: error,
      });
      this.store.update({ message: mapped.message, error: mapped });
      throw mapped;
    }
  }

  updateSubtitleDisplaySettings(
    patch: Partial<SubtitleDisplaySettings>,
  ): void {
    const current = this.store.getSnapshot().subtitleDisplay;
    const next = sanitizeSubtitleDisplaySettings({ ...current, ...patch });
    this.store.update({ subtitleDisplay: next });
    this.dependencies.rendering?.updateSettings(next);
  }

  getPopupStateContext(): PopupStateContext {
    const active = this.sessions.getActive();
    const providerId = active?.providerId ?? this.settings.provider;
    const modelId = active?.modelId ?? (
      providerId === 'gemini' ? 'gemini-2.5-flash' : ''
    );
    return {
      currentUrl: typeof location !== 'undefined' ? location.href : null,
      videoTitle:
        typeof document !== 'undefined'
          ? document.title.replace(/\s*-\s*YouTube\s*$/i, '')
          : null,
      providerId,
      modelId,
      providerReady: providerId === 'gemini' && modelId.length > 0,
      providerMessage: providerId === 'gemini'
          ? 'Gemini is selected. The background worker will validate the API key.'
        : 'This provider is not enabled in the stable workflow.',
      targetLanguage: active?.targetLanguage ?? this.settings.targetLanguage,
    };
  }

  async discoverTracksForCurrentVideo(): Promise<void> {
    const videoId = this.navigation.getCurrentVideoId();
    if (!videoId) throw new ApplicationError({
      code: 'VIDEO_NOT_FOUND',
      title: 'No supported video',
      message: 'Open a YouTube watch page first.',
    });
    const session = new TranslationSession({
      videoId,
      targetLanguage: this.settings.targetLanguage,
      providerId: this.settings.provider,
      modelId: this.getPopupStateContext().modelId,
    });
    await this.discoverCaptionTracks(session);
  }

  async startTranslationWorkflow(input: {
    captionTrackId?: string;
    targetLanguage: string;
    providerId: string;
    modelId: string;
    source: TranslationActivationSource;
  }): Promise<void> {
    let state = this.store.getSnapshot();
    const videoId = state.videoId ?? this.navigation.getCurrentVideoId();
    if (!videoId) throw new ApplicationError({
      code: 'VIDEO_NOT_FOUND',
      title: 'No supported video',
      message: 'Open a YouTube watch page first.',
    });
    if (state.status === 'loading-captions' || state.status === 'translating' ||
        state.status === 'preparing-translation') {
      throw new ApplicationError({
        code: 'TRANSLATION_ALREADY_RUNNING',
        title: 'Translation already running',
        message: 'Cancel the current translation before starting another.',
        retryable: false,
      });
    }
    // A new explicit click starts a fresh workflow after a failed, partial, or
    // completed attempt. Keep discovered tracks, but clear the old session
    // state so the state machine can enter discovery/loading again.
    if (
      state.status === 'failed' ||
      state.status === 'partially-completed' ||
      state.status === 'completed' ||
      state.status === 'cancelled'
    ) {
      await this.dependencies.rendering?.clear();
      this.store.transition('idle', {
        sessionId: null,
        error: null,
        translationDocument: null,
        translatedTrack: [],
        batchResults: [],
        subtitlesEnabled: false,
        renderingActive: false,
        activeRenderedCueId: null,
        message: 'Preparing subtitle translation.',
      });
      state = this.store.getSnapshot();
    }
    this.store.update({
      activation: { requested: true, source: input.source, requestedAt: Date.now() },
      error: null,
    });
    const session = this.createTranslationSession({
      videoId,
      captionTrackId: input.captionTrackId,
      targetLanguage: input.targetLanguage,
      providerId: input.providerId,
      modelId: input.modelId,
    });
    try {
      const tracks = state.availableCaptionTracks.length > 0
        ? state.availableCaptionTracks
        : await this.discoverCaptionTracks(session);
      this.assertSessionCurrent(session.id);
      const selected = input.captionTrackId
        ? tracks.find((track) => track.id === input.captionTrackId)
        // Preserve YouTube's captionTracks order. The legacy working path used
        // captionTracks[0] as its base source track; silently preferring a
        // manual track can select a different signed URL that returns empty.
        : tracks.find((track) => track.isDefault) ?? tracks[0];
      if (!selected) throw new ApplicationError({
        code: 'CAPTIONS_NOT_FOUND', title: 'Captions unavailable',
        message: 'No caption track is available for this video.', retryable: false,
      });
      const document = await this.loadCaptions(session, {
      trackId: selected.id,
      languageCode: this.settings.sourceLanguage === 'auto'
        ? undefined
        : this.settings.sourceLanguage,
      preferManual: true,
      });
      const translated = await this.translateCaptions(session, document);
      await this.showTranslatedSubtitles(session, translated);
      this.completeSession(session.id);
    } catch (error) {
      if (session.signal.aborted) return;
      throw error;
    }
  }

  cancelSessionById(sessionId: string): void {
    if (this.sessions.getActive()?.id !== sessionId) return;
    this.cancelActiveSession('Translation cancelled.');
  }

  async setSubtitlesEnabled(enabled: boolean): Promise<void> {
    this.store.update({ subtitlesEnabled: enabled });
    if (!enabled) {
      await this.dependencies.rendering?.clear();
      this.store.update({ renderingActive: false });
      return;
    }
    const document = this.store.getSnapshot().translationDocument;
    if (document && this.dependencies.rendering) {
      await this.dependencies.rendering.show(document, this.store.getSnapshot().subtitleDisplay);
      this.store.update({ renderingActive: true });
    }
  }

  async clearCurrentTranslation(): Promise<void> {
    await this.dependencies.rendering?.clear();
    this.store.update({
      translationDocument: null,
      batchResults: [],
      translatedTrack: [],
      renderingActive: false,
      message: 'Translation cleared.',
    });
  }

  isSessionCurrent(sessionId: string): boolean {
    return this.sessions.isCurrent(sessionId);
  }

  assertSessionCurrent(sessionId: string): void {
    this.sessions.assertCurrent(sessionId);
  }

  completeSession(sessionId: string): void {
    this.sessions.complete(sessionId);
  }

  async discoverCaptionTracks(
    session: TranslationSession,
  ): Promise<readonly CaptionTrack[]> {
    this.assertSessionCurrent(session.id);
    const discovery = this.dependencies.captionExtraction;
    if (!discovery) throw new Error('Caption extraction is not configured.');
    this.store.transition('discovering-tracks', {
      message: 'Checking available caption tracks.',
      error: null,
    });
    try {
      const tracks = await discovery.discoverTracks(session.signal);
      this.assertSessionCurrent(session.id);
      this.store.transition('tracks-ready', {
        availableCaptionTracks: tracks,
        selectedCaptionTrackId: tracks.length === 1 ? tracks[0].id : null,
        message:
          tracks.length === 1
            ? 'One caption track is available.'
            : `${tracks.length} caption tracks are available.`,
      });
      return tracks;
    } catch (error) {
      if (!this.isSessionCurrent(session.id)) throw error;
      const applicationError = mapCaptionError(error);
      this.store.transition('failed', {
        message: applicationError.message,
        error: applicationError,
      });
      throw applicationError;
    }
  }

  async loadCaptions(
    session: TranslationSession,
    selection: TrackSelectionPreferences,
  ): Promise<CaptionDocument> {
    this.assertTranslationRequested();
    this.assertSessionCurrent(session.id);
    const extraction = this.dependencies.captionExtraction;
    if (!extraction) throw new Error('Caption extraction is not configured.');
    this.store.transition('loading-captions', {
      message: 'Loading YouTube captions.',
      error: null,
    });
    try {
      const document = await extraction.extract({
        videoId: session.videoId,
        selection,
        signal: session.signal,
      });
      this.assertSessionCurrent(session.id);
      this.store.transition('captions-ready', {
        message: `${document.cues.length} caption cues loaded.`,
        sourceTrack: document.cues,
        progress: { totalCues: document.cues.length },
        selectedCaptionTrackId: document.track.id,
      });
      return document;
    } catch (error) {
      if (!this.isSessionCurrent(session.id)) throw error;
      const applicationError = mapCaptionError(error);
      this.store.transition(
        applicationError.code === 'SESSION_CANCELLED' ? 'cancelled' : 'failed',
        { message: applicationError.message, error: applicationError },
      );
      throw applicationError;
    }
  }

  cancelActiveSession(reason = 'Translation cancelled'): void {
    const active = this.sessions.getActive();
    this.sessions.cancelActive(reason);
    if (!active) return;

    const status = this.store.getSnapshot().status;
    if (status !== 'cancelled') {
      this.store.transition('cancelled', {
        message: reason,
        sessionId: null,
      });
    }
  }

  private readonly handleNavigationStart = (): void => {
    void this.dependencies.rendering?.clear();
    this.cancelActiveSession('Translation cancelled because the page changed.');
  };

  private readonly handleVideoChanged = (change: NavigationChange): void => {
    void this.resetForVideo(change.videoId);
  };

  private assertTranslationRequested(): void {
    if (!this.store.getSnapshot().activation.requested) {
      throw new ApplicationError({
        code: 'USER_ACTION_REQUIRED', title: 'Translation not requested',
        message: 'Translation can start only after an explicit user action.', retryable: false,
      });
    }
  }

  private async resetForVideo(videoId: string | null): Promise<void> {
    this.cancelActiveSession('The active YouTube video changed.');
    await this.dependencies.rendering?.clear();
    if (videoId) {
      this.store.resetForVideo({
        videoId,
        message: 'Video detected. Open the extension to translate subtitles.',
      });
    } else {
      this.store.reset(createInitialState({}));
      this.store.update({ message: 'Open a supported YouTube video.' });
    }
  }
}
