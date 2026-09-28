import React from 'react';
import type { OverlayViewModel } from './OverlayViewModel';

export interface SubtitleOverlayProps {
  readonly model: OverlayViewModel;
}

export function SubtitleOverlay({ model }: SubtitleOverlayProps): React.ReactElement | null {
  const { cue, settings } = model;
  if (!model.visible || !cue) return null;
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
      <div className="ai-subtitle-box" role="status">
        {showTranslation && cue.translatedText ? (
          <div className="ai-subtitle-translated" lang={cue.targetLanguage} dir="auto">
            {cue.translatedText}
          </div>
        ) : null}
        {showOriginal ? (
          <div className="ai-subtitle-original" lang={cue.sourceLanguage} dir="auto">
            {cue.originalText}
          </div>
        ) : null}
        {showTranslation && !cue.translatedText && settings.mode === 'translated' ? (
          <div className="ai-subtitle-unavailable" aria-label="Translation unavailable for this subtitle">
            {cue.originalText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
