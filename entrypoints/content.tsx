import React from 'react';
import ReactDOM from 'react-dom/client';
import { SubtitleOverlay } from '../components/SubtitleOverlay';
import { InPlayerControls, type ExportMode } from '../components/InPlayerControls';
import { TranscriptPanel } from '../components/TranscriptPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getSettings, saveSettings } from '../utils/storage';
import {
  ExtensionSettings,
  TranscriptSegment,
  TranslatedSegment,
  TranslationPhase,
  TranslationStateSnapshot,
} from '../utils/types';
import { translateBatch } from '../utils/translationEngine';
import { findActiveCue, RunGuard } from '../utils/subtitleRuntime';
import { SafeRootRenderer } from '../utils/safeRootRenderer';
import {
  extractFullTranscriptFromDOM,
  fetchDirectYouTubeCaptions,
  collapseRepeatedText,
  validateSubtitleTrack,
  validateExportTracks,
  logTrackStage,
  exportToSRT,
  exportToJSON,
  triggerBrowserDownload,
  canExportFullTrack,
} from '../utils/transcript';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('[AI Subtitles] Content script initialized with Redesign & Reliability Runtime');

    // ─── Runtime State Machine ───────────────────────────────────────────────
    let settings: ExtensionSettings = await getSettings();

    const runtimeState = {
      phase: 'idle' as TranslationPhase,
      message: '',
      videoId: null as string | null,
      translatedCount: 0,
      totalCount: 0,
      sourceTrack: [] as TranscriptSegment[],
      track: [] as TranslatedSegment[],
      activeIndex: -1,
      subtitlesEnabled: settings.autoTranslate,
      transcriptPanelOpen: false,
      error: undefined as string | undefined,
    };

    const runGuard = new RunGuard();
    let finishSequence = 0;

    // Concurrency guard: single in-flight translation promise per video ID
    let activeExtraction: { videoId: string; promise: Promise<void>; taskKey: string } | null = null;

    // Safe UI React Renderers
    const subtitleRenderer = new SafeRootRenderer('yt-ai-subtitle-overlay');
    const controlsRenderer = new SafeRootRenderer('yt-ai-controls');
    const transcriptRenderer = new SafeRootRenderer('yt-ai-transcript-panel');

    // Video Element & Bound Listener references
    let currentVideoEl: HTMLVideoElement | null = null;
    let boundTimeUpdateListener: (() => void) | null = null;
    let boundSeekingListener: (() => void) | null = null;

    // Live Caption Observer State
    let liveObserver: MutationObserver | null = null;
    let debounceTimer: any = null;
    let lastProcessedText = '';
    const translationCache = new Map<string, string>();
    let pendingQueue: string[] = [];
    let isTranslatingQueue = false;

    // ─── Helpers: Notify popup & Update Native Captions ───────────────────────

    const broadcastState = () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime
            .sendMessage({
              type: 'POPUP_STATUS_UPDATE',
              message: runtimeState.message,
              isReady: runtimeState.phase === 'ready',
              isError: runtimeState.phase === 'error',
              phase: runtimeState.phase,
            })
            .catch(() => {});
        }
      } catch {}
    };

    const updateNativeCaptionVisibility = () => {
      try {
        const moviePlayer = document.getElementById('movie_player');
        const shouldHide =
          runtimeState.subtitlesEnabled &&
          runtimeState.track.length > 1 &&
          runtimeState.activeIndex >= 0;

        if (moviePlayer) {
          moviePlayer.classList.toggle('yt-ai-subtitles-active', shouldHide);
        }

        let styleEl = document.getElementById('yt-ai-scoped-native-subs');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'yt-ai-scoped-native-subs';
          document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
          .yt-ai-subtitles-active .ytp-caption-window-bottom,
          .yt-ai-subtitles-active .caption-window,
          .yt-ai-subtitles-active .ytp-caption-segment,
          .yt-ai-subtitles-active .ytp-caption-window-rollup,
          .yt-ai-subtitles-active .ytp-caption-window-container,
          .yt-ai-subtitles-active .caption-visual-line {
            opacity: 0.0001 !important;
            pointer-events: none !important;
            color: transparent !important;
            background: transparent !important;
            text-shadow: none !important;
          }
        `;
      } catch (err) {
        console.warn('[AI Subtitles] Error updating native caption visibility:', err);
      }
    };

    // ─── UI Rendering ────────────────────────────────────────────────────────

    const renderOverlay = () => {
      try {
        const moviePlayer =
          document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        if (!moviePlayer) return;

        const activeCue =
          runtimeState.subtitlesEnabled && runtimeState.activeIndex >= 0
            ? runtimeState.track[runtimeState.activeIndex] || null
            : null;

        const statusKind =
          runtimeState.phase === 'error'
            ? 'error'
            : runtimeState.phase === 'ready'
            ? 'success'
            : 'info';

        subtitleRenderer.render(
          'yt-ai-subtitle-container',
          () => {
            const container = document.createElement('div');
            container.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:60;';
            return container;
          },
          moviePlayer,
          <SubtitleOverlay
            currentSegment={activeCue}
            settings={settings}
            statusText={
              runtimeState.phase === 'extracting' || runtimeState.phase === 'translating'
                ? runtimeState.message
                : undefined
            }
            statusKind={statusKind}
          />
        );

        updateNativeCaptionVisibility();
      } catch (err) {
        console.warn('[AI Subtitles] Error rendering overlay:', err);
      }
    };

    const renderControls = () => {
      try {
        const rightControls = document.querySelector('.ytp-right-controls');
        if (!rightControls) return;

        const isTranslating =
          runtimeState.phase === 'extracting' || runtimeState.phase === 'translating';

        controlsRenderer.render(
          'yt-ai-controls-wrapper',
          () => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.verticalAlign = 'top';
            wrapper.style.height = '100%';
            return wrapper;
          },
          rightControls,
          <InPlayerControls
            settings={settings}
            isTranslating={isTranslating}
            hasSubtitles={runtimeState.track.length > 0}
            isTranscriptOpen={runtimeState.transcriptPanelOpen}
            onToggleSubs={() => {
              runtimeState.subtitlesEnabled = !runtimeState.subtitlesEnabled;
              saveSettings({ autoTranslate: runtimeState.subtitlesEnabled });
              updateNativeCaptionVisibility();
              renderControls();
              renderOverlay();
            }}
            onToggleTranscript={() => {
              runtimeState.transcriptPanelOpen = !runtimeState.transcriptPanelOpen;
              renderTranscript();
              renderControls();
            }}
            onDownload={(mode) => handleDownloadSubtitles(mode)}
          />
        );
      } catch (err) {
        console.warn('[AI Subtitles] Error rendering controls:', err);
      }
    };

    const renderTranscript = () => {
      try {
        if (!runtimeState.transcriptPanelOpen) {
          transcriptRenderer.unmount();
          document.getElementById('yt-ai-transcript-wrapper')?.remove();
          return;
        }

        const handleSeek = (time: number) => {
          const video = document.querySelector('video');
          if (video) {
            video.currentTime = time;
            video.play().catch(() => {});
          }
        };

        transcriptRenderer.render(
          'yt-ai-transcript-wrapper',
          () => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:fixed;top:64px;right:16px;z-index:2200;';
            return wrapper;
          },
          document.body,
          <TranscriptPanel
            segments={runtimeState.track}
            activeIndex={runtimeState.activeIndex}
            onSeek={handleSeek}
            onClose={() => {
              runtimeState.transcriptPanelOpen = false;
              renderTranscript();
              renderControls();
            }}
            onDownload={() => handleDownloadSubtitles('translated')}
          />
        );
      } catch (err) {
        console.warn('[AI Subtitles] Error rendering transcript:', err);
      }
    };

    // ─── Export Handler with Truthful Verification ───────────────────────────

    const handleDownloadSubtitles = (
      mode: ExportMode = 'translated'
    ): { success: boolean; count: number; error?: string } => {
      if (runtimeState.track.length === 0) {
        console.warn('[AI Subtitles] ⚠️ No subtitles available to export.');
        return {
          success: false,
          count: 0,
          error: 'No subtitles are available to export. Live captions can only be exported after playback.',
        };
      }

      // If sourceTrack is available, validate alignment and ensure translation is fully ready
      if (runtimeState.sourceTrack.length > 0) {
        if (!canExportFullTrack(runtimeState.phase, runtimeState.sourceTrack.length, runtimeState.track.length)) {
          const errMsg = `Full export blocked: translation is ${runtimeState.phase} (${runtimeState.track.length}/${runtimeState.sourceTrack.length} cues translated).`;
          console.warn(`[AI Subtitles] ${errMsg}`);
          return {
            success: false,
            count: 0,
            error: errMsg,
          };
        }
        try {
          validateExportTracks(runtimeState.sourceTrack, runtimeState.track);
        } catch (valErr: any) {
          console.warn('[AI Subtitles] Track validation error:', valErr);
          return {
            success: false,
            count: 0,
            error: valErr.message || 'Track alignment validation failed.',
          };
        }
      }

      const videoEl = document.querySelector('video');
      const videoDuration = videoEl?.duration || 0;
      const validation = validateSubtitleTrack(runtimeState.track, videoDuration);

      logTrackStage(`Export (${mode})`, runtimeState.track);

      const videoTitle = document.title.replace(/ - YouTube$/, '').trim() || 'subtitles';
      const cleanTitle = videoTitle.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 50);
      const isLiveOnly = validation.completeness === 'live';
      const fileSuffix = isLiveOnly ? `${mode}_live_partial` : mode;

      try {
        if (mode === 'json') {
          const json = exportToJSON(runtimeState.track, {
            title: videoTitle,
            url: window.location.href,
            provider: settings.provider,
            targetLanguage: settings.targetLanguage,
            totalCues: runtimeState.track.length,
            completeness: validation.completeness,
            coveredDuration: validation.coveredDuration,
            videoDuration,
          });
          triggerBrowserDownload(json, `${cleanTitle}_subtitles_${fileSuffix}.json`, 'application/json');
        } else {
          const srt = exportToSRT(runtimeState.track, mode as any);
          triggerBrowserDownload(srt, `${cleanTitle}_${fileSuffix}.srt`, 'text/plain;charset=utf-8');
        }
        console.log(
          `[AI Subtitles] 📥 Exported ${runtimeState.track.length} cues (${validation.completeness}) in ${mode} format.`
        );
        return { success: true, count: runtimeState.track.length };
      } catch (err: any) {
        console.error('[AI Subtitles] Export failed:', err);
        return { success: false, count: 0, error: err.message || 'Failed to export subtitles.' };
      }
    };

    // ─── Video Playback Sync via addEventListener ────────────────────────────

    const setupVideoListeners = () => {
      try {
        const videoEl = document.querySelector('video') as HTMLVideoElement | null;
        if (!videoEl) return;

        if (currentVideoEl === videoEl && boundTimeUpdateListener && boundSeekingListener) {
          return;
        }

        if (currentVideoEl && currentVideoEl !== videoEl) {
          cleanupVideoListeners();
        }

        currentVideoEl = videoEl;

        boundTimeUpdateListener = () => {
          try {
            if (runtimeState.track.length === 0) return;
            const t = videoEl.currentTime;
            const nextIndex = findActiveCue(
              runtimeState.track,
              t,
              runtimeState.activeIndex,
              settings.subtitleSyncOffsetMs
            );

            if (nextIndex !== runtimeState.activeIndex) {
              runtimeState.activeIndex = nextIndex;
              renderOverlay();
              if (runtimeState.transcriptPanelOpen) {
                renderTranscript();
              }
            }
          } catch (err) {
            console.warn('[AI Subtitles] Error in timeupdate listener:', err);
          }
        };

        boundSeekingListener = () => {
          try {
            if (runtimeState.track.length === 0) return;
            const t = videoEl.currentTime;
            runtimeState.activeIndex = findActiveCue(
              runtimeState.track,
              t,
              -1,
              settings.subtitleSyncOffsetMs
            );
            renderOverlay();
            if (runtimeState.transcriptPanelOpen) {
              renderTranscript();
            }
          } catch (err) {
            console.warn('[AI Subtitles] Error in seeking listener:', err);
          }
        };

        videoEl.addEventListener('timeupdate', boundTimeUpdateListener);
        videoEl.addEventListener('seeking', boundSeekingListener);
      } catch (err) {
        console.warn('[AI Subtitles] Error setting up video listeners:', err);
      }
    };

    const cleanupVideoListeners = () => {
      try {
        if (currentVideoEl) {
          if (boundTimeUpdateListener) {
            currentVideoEl.removeEventListener('timeupdate', boundTimeUpdateListener);
            boundTimeUpdateListener = null;
          }
          if (boundSeekingListener) {
            currentVideoEl.removeEventListener('seeking', boundSeekingListener);
            boundSeekingListener = null;
          }
          currentVideoEl = null;
        }
      } catch (err) {
        console.warn('[AI Subtitles] Error cleaning up video listeners:', err);
      }
    };

    // ─── Translation Execution Pipeline ──────────────────────────────────────

    const executeTranslation = async (videoId: string) => {
      const { id: runId, signal } = runGuard.next();
      runtimeState.phase = 'extracting';
      runtimeState.message = 'Extracting captions…';
      runtimeState.videoId = videoId;
      runtimeState.sourceTrack = [];
      runtimeState.track = [];
      runtimeState.activeIndex = -1;
      runtimeState.error = undefined;
      broadcastState();
      renderOverlay();
      renderControls();

      // Ensure YouTube CC is turned on
      const ccButton = document.querySelector('.ytp-subtitles-button') as HTMLElement;
      if (ccButton && ccButton.getAttribute('aria-pressed') !== 'true') {
        ccButton.click();
      }

      let rawSegments: TranscriptSegment[] = [];

      // ── Priority 1: YouTube direct pre-translated tracks (if provider is youtube) ──
      if (settings.provider === 'youtube') {
        runtimeState.message = 'Checking YouTube caption tracks…';
        broadcastState();
        renderOverlay();

        const directTracks = await fetchDirectYouTubeCaptions(
          videoId,
          settings.targetLanguage,
          settings.subtitleBilingual,
          signal
        );

        if (!runGuard.valid(runId)) return;

        const isTranslated = directTracks.some(
          (t) => t.translatedText && t.translatedText !== t.text
        );

        if (directTracks.length > 0 && isTranslated) {
          directTracks.sort((a, b) => a.start - b.start);
          runtimeState.sourceTrack = directTracks.map((d) => ({
            id: d.id,
            start: d.start,
            dur: d.dur,
            text: d.text,
            source: d.source,
          }));
          runtimeState.track = directTracks;
          runtimeState.translatedCount = directTracks.length;
          runtimeState.totalCount = directTracks.length;
          runtimeState.phase = 'ready';
          runtimeState.message = `✨ Subtitles ready (${directTracks.length} cues)`;

          logTrackStage('Extracted & Translated (YouTube Direct)', runtimeState.track);

          updateNativeCaptionVisibility();
          setupVideoListeners();
          renderControls();
          renderOverlay();
          broadcastState();

          console.log(
            `[AI Subtitles] Ready: cues=${directTracks.length} coveredDuration=${directTracks[
              directTracks.length - 1
            ].start.toFixed(1)}s`
          );
          return;
        }

        if (directTracks.length > 0) {
          rawSegments = directTracks;
        }
      }

      // ── Priority 2: Extract from modern visible / expandable transcript panel in DOM ──
      if (rawSegments.length === 0) {
        runtimeState.message = 'Extracting transcript from video panel…';
        broadcastState();
        renderOverlay();

        try {
          rawSegments = await extractFullTranscriptFromDOM(signal, videoId, settings);
        } catch (domErr) {
          console.warn('[AI Subtitles] DOM transcript extraction error:', domErr);
        }

        if (!runGuard.valid(runId)) return;
      }

      // ── Priority 3: Fallback to timedtext fetchDirectYouTubeCaptions(videoId) ──
      if (rawSegments.length === 0) {
        runtimeState.message = 'Extracting captions from player…';
        broadcastState();
        renderOverlay();

        rawSegments = await fetchDirectYouTubeCaptions(videoId, undefined, false, signal);
        if (!runGuard.valid(runId)) return;
      }

      // ── Priority 4: If no bulk transcript exists, switch to live observer ───────
      if (rawSegments.length === 0) {
        runtimeState.phase = 'partial';
        runtimeState.message = 'Live subtitles connected. Play the video to capture captions.';
        runtimeState.totalCount = 0;
        runtimeState.translatedCount = 0;
        broadcastState();
        renderOverlay();
        return;
      }

      runtimeState.sourceTrack = rawSegments;
      logTrackStage('Extracted (Source)', rawSegments);

      // ── Step 4: AI Translation Pipeline for Extracted Cues ──────────────────
      const total = rawSegments.length;
      runtimeState.totalCount = total;
      const INITIAL_BATCH = Math.min(20, total);

      runtimeState.phase = 'translating';
      runtimeState.message = `Translating first section (${INITIAL_BATCH}/${total} cues)…`;
      broadcastState();
      renderOverlay();

      try {
        const nextCueAfterBatch = total > INITIAL_BATCH ? rawSegments[INITIAL_BATCH] : undefined;
        const initialTranslated = await translateBatch(
          rawSegments.slice(0, INITIAL_BATCH),
          settings,
          document.title,
          undefined,
          nextCueAfterBatch
        );

        if (!runGuard.valid(runId)) return;

        runtimeState.track = [...initialTranslated];
        runtimeState.translatedCount = initialTranslated.length;
        runtimeState.phase = total <= INITIAL_BATCH ? 'ready' : 'partial';
        runtimeState.message = `✨ Ready (${runtimeState.translatedCount}/${total} translated)`;

        logTrackStage('Translated (Initial Batch)', runtimeState.track);

        updateNativeCaptionVisibility();
        setupVideoListeners();
        renderControls();
        renderOverlay();
        broadcastState();

        // Background translation of remaining batches
        if (total > INITIAL_BATCH) {
          (async () => {
            const BATCH_SIZE = 25;
            for (let i = INITIAL_BATCH; i < total; i += BATCH_SIZE) {
              if (!runGuard.valid(runId)) return;

              try {
                const prevCue = rawSegments[i - 1];
                const nextCue = i + BATCH_SIZE < total ? rawSegments[i + BATCH_SIZE] : undefined;
                const chunk = await translateBatch(
                  rawSegments.slice(i, i + BATCH_SIZE),
                  settings,
                  document.title,
                  prevCue,
                  nextCue
                );
                if (!runGuard.valid(runId)) return;

                runtimeState.track.push(...chunk);
                runtimeState.translatedCount = runtimeState.track.length;
                runtimeState.phase = runtimeState.translatedCount >= total ? 'ready' : 'partial';
                runtimeState.message = `Subtitles (${runtimeState.translatedCount}/${total} cues)`;

                if (runtimeState.phase === 'ready') {
                  logTrackStage('Translated (Complete Track)', runtimeState.track);
                }

                renderControls();
                if (runtimeState.transcriptPanelOpen) renderTranscript();
                broadcastState();
              } catch (batchErr) {
                console.warn('[AI Subtitles] Background batch error:', batchErr);
                if (runGuard.valid(runId)) {
                  runtimeState.phase = 'partial';
                  runtimeState.message = `Partial subtitles (${runtimeState.translatedCount}/${total} cues)`;
                  broadcastState();
                }
                break;
              }
            }
          })();
        }
      } catch (err: any) {
        if (!runGuard.valid(runId)) return;
        runtimeState.phase = 'error';
        runtimeState.message = err.message || 'Translation failed';
        runtimeState.error = err.message;
        broadcastState();
        renderOverlay();
      }
    };

    const startTranslation = (videoId: string) => {
      const taskKey = `${videoId}_${settings.targetLanguage}_${settings.provider}`;
      if (activeExtraction && activeExtraction.taskKey === taskKey) {
        return activeExtraction.promise;
      }

      const promise = executeTranslation(videoId).finally(() => {
        if (activeExtraction?.promise === promise) {
          activeExtraction = null;
        }
      });

      activeExtraction = { videoId, promise, taskKey };
      return promise;
    };

    // ─── Live Observer with video.currentTime and Phrase Collapse ────────────

    const processLiveQueue = async (runId: number) => {
      if (isTranslatingQueue || pendingQueue.length === 0) return;
      if (!runGuard.valid(runId)) return;
      isTranslatingQueue = true;
      const textToTranslate = pendingQueue.shift()!;

      const video = document.querySelector('video');
      const cueStart = video ? Math.max(0, video.currentTime) : 0;

      try {
        const translated = await translateBatch(
          [{ start: cueStart, dur: 4.0, text: textToTranslate }],
          settings,
          document.title
        );

        if (!runGuard.valid(runId)) return;

        if (translated.length > 0) {
          translationCache.set(textToTranslate, translated[0].translatedText);
          const liveCue: TranslatedSegment = {
            start: cueStart,
            dur: 4.0,
            text: textToTranslate,
            translatedText: translated[0].translatedText,
          };

          runtimeState.track = [liveCue];
          runtimeState.activeIndex = 0;
          renderOverlay();
        }
      } catch (err) {
        console.warn('[AI Subtitles] Live queue translation error:', err);
      } finally {
        isTranslatingQueue = false;
        if (pendingQueue.length > 0 && runGuard.valid(runId)) {
          processLiveQueue(runId);
        }
      }
    };

    const setupLiveCaptionObserver = () => {
      try {
        if (liveObserver) {
          liveObserver.disconnect();
          liveObserver = null;
        }

        liveObserver = new MutationObserver(() => {
          try {
            if (runtimeState.track.length > 1) return; // Full track active

            const captionSegments = document.querySelectorAll(
              '.ytp-caption-segment, .caption-visual-line, .ytp-caption-window-bottom span'
            );
            const raw = Array.from(captionSegments)
              .map((el) => (el.textContent || '').trim())
              .filter(Boolean)
              .join(' ');

            const clean = collapseRepeatedText(raw);
            if (!clean || clean === lastProcessedText) return;

            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              try {
                if (!clean || clean === lastProcessedText) return;
                lastProcessedText = clean;

                const video = document.querySelector('video');
                const cueStart = video ? Math.max(0, video.currentTime) : 0;

                const cached = translationCache.get(clean);
                if (cached) {
                  runtimeState.track = [
                    { start: cueStart, dur: 4.0, text: clean, translatedText: cached },
                  ];
                  runtimeState.activeIndex = 0;
                  renderOverlay();
                } else if (!pendingQueue.includes(clean)) {
                  pendingQueue.push(clean);
                  const currentRunId = (runGuard as any).currentId || 0;
                  processLiveQueue(currentRunId);
                }
              } catch (timerErr) {
                console.warn('[AI Subtitles] Error in live caption timer:', timerErr);
              }
            }, 200);
          } catch (obsErr) {
            console.warn('[AI Subtitles] Error in live caption mutation observer:', obsErr);
          }
        });

        const player = document.getElementById('movie_player') || document.body;
        liveObserver.observe(player, { childList: true, subtree: true, characterData: true });
      } catch (err) {
        console.warn('[AI Subtitles] Error setting up live caption observer:', err);
      }
    };

    // ─── Navigation Lifecycle (yt-navigate-start & finish) ───────────────────

    const handleNavigateStart = () => {
      try {
        console.log('[AI Subtitles] 🚀 Navigation start detected — cleaning up session');
        finishSequence++;
        runGuard.cancel();
        activeExtraction = null;

        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        pendingQueue = [];
        isTranslatingQueue = false;

        cleanupVideoListeners();

        if (liveObserver) {
          liveObserver.disconnect();
          liveObserver = null;
        }

        runtimeState.phase = 'idle';
        runtimeState.message = '';
        runtimeState.videoId = null;
        runtimeState.sourceTrack = [];
        runtimeState.track = [];
        runtimeState.activeIndex = -1;
        runtimeState.translatedCount = 0;
        runtimeState.totalCount = 0;
        runtimeState.error = undefined;

        subtitleRenderer.unmount();
        controlsRenderer.unmount();
        transcriptRenderer.unmount();

        document.getElementById('movie_player')?.classList.remove('yt-ai-subtitles-active');
      } catch (err) {
        console.warn('[AI Subtitles] Error in handleNavigateStart:', err);
      }
    };

    const handleNavigateFinish = async () => {
      try {
        if (!window.location.pathname.startsWith('/watch')) return;
        const seq = ++finishSequence;
        console.log('[AI Subtitles] 🎬 Navigation finish detected — initializing session');

        const urlParams = new URLSearchParams(window.location.search);
        const newVideoId = urlParams.get('v');
        if (!newVideoId) return;

        // Reset renderers from unmounted state
        subtitleRenderer.reset();
        controlsRenderer.reset();
        transcriptRenderer.reset();

        runtimeState.videoId = newVideoId;

        for (let i = 0; i < 50; i++) {
          if (seq !== finishSequence) return;
          const player = document.getElementById('movie_player');
          const video = document.querySelector('video');
          if (player && video) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        if (seq !== finishSequence) return;

        renderControls();
        renderOverlay();
        setupLiveCaptionObserver();
        setupVideoListeners();

        if (settings.autoTranslate) {
          startTranslation(newVideoId);
        }
      } catch (err) {
        console.warn('[AI Subtitles] Error in handleNavigateFinish:', err);
      }
    };

    document.addEventListener('yt-navigate-start', handleNavigateStart);
    document.addEventListener('yt-navigate-finish', handleNavigateFinish);

    // ─── Storage Changes Listener ─────────────────────────────────────────────

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes) => {
        try {
          if (changes.yt_ai_settings?.newValue) {
            settings = changes.yt_ai_settings.newValue;
            runtimeState.subtitlesEnabled = settings.autoTranslate;
            if (window.location.pathname.startsWith('/watch')) {
              renderOverlay();
              renderControls();
              if (runtimeState.transcriptPanelOpen) renderTranscript();
            }
          }
        } catch (err) {
          console.warn('[AI Subtitles] Error in storage change listener:', err);
        }
      });
    }

    // ─── Message Protocol (from Popup) ────────────────────────────────────────

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        try {
          if (message.type === 'START_TRANSLATION_NOW') {
            const urlParams = new URLSearchParams(window.location.search);
            const videoId = urlParams.get('v');
            if (videoId) {
              startTranslation(videoId);
              sendResponse({ status: 'Translation started' });
            } else {
              sendResponse({ status: 'No active video found' });
            }
            return true;
          }

          if (message.type === 'GET_TRANSLATION_STATE') {
            const snapshot: TranslationStateSnapshot = {
              phase: runtimeState.phase,
              message: runtimeState.message,
              videoId: runtimeState.videoId,
              translatedCount: runtimeState.translatedCount,
              totalCount: runtimeState.totalCount,
              hasSubtitles: runtimeState.track.length > 0,
              subtitlesEnabled: runtimeState.subtitlesEnabled,
              transcriptPanelOpen: runtimeState.transcriptPanelOpen,
              error: runtimeState.error,
            };
            sendResponse(snapshot);
            return true;
          }

          if (message.type === 'DOWNLOAD_SUBTITLES') {
            const result = handleDownloadSubtitles(message.mode || 'translated');
            sendResponse(result);
            return true;
          }
        } catch (err) {
          console.warn('[AI Subtitles] Error in runtime message listener:', err);
        }
      });
    }

    // ─── Initial Page Load Setup ──────────────────────────────────────────────

    setTimeout(() => {
      try {
        if (window.location.pathname.startsWith('/watch')) {
          handleNavigateFinish();
        }
      } catch (err) {
        console.warn('[AI Subtitles] Error in initial page load setup:', err);
      }
    }, 500);
  },
});
