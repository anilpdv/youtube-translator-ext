import React from 'react';
import type { ExtensionSettings, TranslatedSegment } from '../utils/types';
import { isSoundLabel } from '../utils/transcript';

interface Props {
  currentSegment: TranslatedSegment | null;
  settings: ExtensionSettings;
  statusText?: string;
  statusKind?: 'info' | 'success' | 'error';
}

const clamp = (val: number | undefined, min: number, max: number, defaultVal: number): number => {
  if (typeof val !== 'number' || isNaN(val)) return defaultVal;
  return Math.min(max, Math.max(min, val));
};

const hexToRgba = (hex: string, alpha: number): string => {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000000';
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  const safeAlpha = clamp(alpha, 0, 1, 0.75);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
};

const getTextShadow = (type: 'none' | 'soft' | 'strong' = 'strong'): string => {
  switch (type) {
    case 'none':
      return 'none';
    case 'soft':
      return '0 1px 2px rgba(0, 0, 0, 0.7)';
    case 'strong':
    default:
      return '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.9)';
  }
};

export const SubtitleOverlay: React.FC<Props> = ({
  currentSegment,
  settings,
  statusText,
  statusKind = 'info',
}) => {
  const isTop = settings.subtitlePosition === 'top';
  const vOffset = clamp(settings.subtitleVerticalOffset, -120, 120, 0);
  const pos: React.CSSProperties = isTop
    ? { top: `${72 + vOffset}px`, bottom: 'auto' }
    : { bottom: `${76 - vOffset}px`, top: 'auto' };

  if (statusText) {
    const borderColor =
      statusKind === 'error'
        ? '#f87171'
        : statusKind === 'success'
        ? '#34d399'
        : '#277e68';
    const textColor =
      statusKind === 'error'
        ? '#fecaca'
        : statusKind === 'success'
        ? '#a7f3d0'
        : '#d5e9e3';

    return (
      <div
        data-testid="subtitle-status"
        style={{
          position: 'absolute',
          ...pos,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 70,
          pointerEvents: 'none',
          padding: '8px 14px',
          borderRadius: '8px',
          background: 'rgba(10, 14, 18, 0.90)',
          border: `1px solid ${borderColor}`,
          color: textColor,
          font: '600 13px system-ui, -apple-system, sans-serif',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        }}
      >
        {statusText}
      </div>
    );
  }

  if (!currentSegment) return null;

  // Non-speech sound description handling
  const isSound = isSoundLabel(currentSegment.text);
  if (isSound && settings.subtitleSoundLabels === 'hide') {
    return null;
  }

  const translated =
    isSound && settings.subtitleSoundLabels === 'original-only'
      ? currentSegment.text
      : currentSegment.translatedText?.trim();

  if (!translated) return null;

  const originalText = currentSegment.text?.trim();
  const showBilingual = settings.subtitleBilingual && originalText && originalText !== translated;
  const fontSize = clamp(settings.subtitleFontSize, 14, 48, 24);
  const lineHeight = clamp(settings.subtitleLineHeight, 1.1, 1.8, 1.3);
  const maxWidth = clamp(settings.subtitleMaxWidth, 40, 100, 82);
  const bgOpacity = clamp(settings.subtitleBackgroundOpacity, 0, 1, 0.75);
  const originalScale = clamp(settings.bilingualOriginalScale, 0.4, 1.0, 0.78);
  const originalOpacity = clamp(settings.bilingualOriginalOpacity, 0.2, 1.0, 0.72);
  const originalFontSize = Math.max(12, Math.round(fontSize * originalScale));
  const isOriginalFirst = settings.bilingualOrder === 'original-first';

  const originalElement = showBilingual ? (
    <span
      key="orig"
      style={{
        fontSize: `${originalFontSize}px`,
        lineHeight,
        fontWeight: Math.max(400, (settings.subtitleFontWeight || 600) - 100),
        color: settings.subtitleFontColor || '#ffffff',
        opacity: originalOpacity,
        textShadow: getTextShadow(settings.subtitleTextShadow),
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {originalText}
    </span>
  ) : null;

  const translatedElement = (
    <span
      key="trans"
      style={{
        fontSize: `${fontSize}px`,
        lineHeight,
        fontWeight: settings.subtitleFontWeight || 600,
        color: settings.subtitleFontColor || '#ffffff',
        textShadow: getTextShadow(settings.subtitleTextShadow),
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {translated}
    </span>
  );

  return (
    <div
      data-testid="subtitle-overlay"
      style={{
        position: 'absolute',
        ...pos,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${maxWidth}%`,
        maxWidth: '1200px',
        textAlign: settings.subtitleAlignment || 'center',
        pointerEvents: 'none',
        zIndex: 70,
        fontFamily: 'Roboto, YouTube Noto, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          gap: '4px',
          maxWidth: '100%',
          padding: '8px 16px',
          borderRadius: '8px',
          background: hexToRgba(settings.subtitleBackground, bgOpacity),
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          textAlign: settings.subtitleAlignment || 'center',
        }}
      >
        {isOriginalFirst ? [originalElement, translatedElement] : [translatedElement, originalElement]}
      </div>
    </div>
  );
};
