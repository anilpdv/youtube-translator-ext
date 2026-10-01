import React from 'react';
import type { OverlayViewModel } from './OverlayViewModel';

export interface SubtitleOverlayProps {
  readonly model: OverlayViewModel;
}

export function SubtitleOverlay({ model }: SubtitleOverlayProps): React.ReactElement | null {
  const { slice, settings } = model;
  if (!model.visible || !slice) return null;
  const showOriginal = settings.mode !== 'translated';
  const showTranslation = settings.mode !== 'original';
  return (
    <div
      className={`ai-subtitle-layer ai-subtitle-position-${settings.verticalPosition}`}
      aria-label="Translated subtitles"
      style={{
        '--ai-subtitle-font-scale': String(settings.fontScale),
        '--ai-subtitle-background-opacity': String(settings.backgroundOpacity),
        '--ai-subtitle-text-opacity': String(settings.textOpacity),
      } as React.CSSProperties}
    >
      <div className="ai-subtitle-box" role="status" aria-live="polite" aria-atomic="true">
        {showTranslation && slice.translatedText ? (
          <div className="ai-subtitle-translated" lang={slice.targetLanguage} dir="auto">
            {slice.translatedText}
          </div>
        ) : null}
        {showOriginal ? (
          <div className="ai-subtitle-original" lang={slice.sourceLanguage} dir="auto">
            {slice.originalText}
          </div>
        ) : null}
        {showTranslation && !slice.translatedText && settings.mode === 'translated' ? (
          <div className="ai-subtitle-unavailable" aria-label="Translation unavailable for this subtitle">
            {slice.originalText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
