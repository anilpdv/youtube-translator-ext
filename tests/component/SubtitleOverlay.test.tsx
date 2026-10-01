import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SubtitleOverlay } from '../../components/SubtitleOverlay';
import { DEFAULT_SETTINGS } from '../../utils/types';
import type { TranslatedSegment } from '../../utils/types';

const seg: TranslatedSegment = {
  start: 0,
  dur: 3,
  text: 'Bonjour tout le monde',
  translatedText: 'Hello everyone',
};

describe('SubtitleOverlay', () => {
  const renderAtCueEnd = (
    currentSegment: TranslatedSegment = seg,
    settings = DEFAULT_SETTINGS,
  ) =>
    render(
      <SubtitleOverlay
        currentSegment={currentSegment}
        settings={settings}
        currentTime={currentSegment.start + currentSegment.dur}
      />
    );

  it('renders nothing when no segment and no status', () => {
    const { container } = render(
      <SubtitleOverlay currentSegment={null} settings={DEFAULT_SETTINGS} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders status text when provided', () => {
    render(
      <SubtitleOverlay currentSegment={null} settings={DEFAULT_SETTINGS} statusText="⏳ Loading…" />
    );
    expect(screen.getByText('⏳ Loading…')).toBeInTheDocument();
    expect(screen.getByTestId('subtitle-status')).toBeInTheDocument();
  });

  it('renders translated text from segment', () => {
    renderAtCueEnd();
    expect(screen.getByText('Hello everyone')).toBeInTheDocument();
    expect(screen.getByTestId('subtitle-overlay')).toBeInTheDocument();
  });

  it('does NOT render original text in monolingual mode', () => {
    render(
      <SubtitleOverlay
        currentSegment={seg}
        settings={{ ...DEFAULT_SETTINGS, subtitleBilingual: false }}
      />
    );
    expect(screen.queryByText('Bonjour tout le monde')).not.toBeInTheDocument();
  });

  it('renders both texts in bilingual mode', () => {
    renderAtCueEnd(seg, { ...DEFAULT_SETTINGS, subtitleBilingual: true });
    expect(screen.getByText('Hello everyone')).toBeInTheDocument();
    expect(screen.getByText('Bonjour tout le monde')).toBeInTheDocument();
  });

  it('renders nothing when translatedText is empty', () => {
    const emptySegment: TranslatedSegment = { ...seg, translatedText: '' };
    const { container } = render(
      <SubtitleOverlay currentSegment={emptySegment} settings={DEFAULT_SETTINGS} />
    );
    expect(container.querySelector('div')).toBeNull();
  });

  it('applies custom font color from settings', () => {
    renderAtCueEnd(seg, { ...DEFAULT_SETTINGS, subtitleFontColor: '#FF0000' });
    const textEl = screen.getByText('Hello everyone');
    expect(textEl.style.color).toBe('rgb(255, 0, 0)');
  });

  it('applies bottom position by default', () => {
    render(<SubtitleOverlay currentSegment={seg} settings={DEFAULT_SETTINGS} />);
    const root = screen.getByTestId('subtitle-overlay');
    expect(root.style.bottom).toBe('76px');
    expect(root.style.top).toBe('auto');
  });

  it('applies top position when configured', () => {
    render(
      <SubtitleOverlay
        currentSegment={seg}
        settings={{ ...DEFAULT_SETTINGS, subtitlePosition: 'top' }}
      />
    );
    const root = screen.getByTestId('subtitle-overlay');
    expect(root.style.top).toBe('72px');
    expect(root.style.bottom).toBe('auto');
  });

  it('applies font size from settings', () => {
    renderAtCueEnd(seg, { ...DEFAULT_SETTINGS, subtitleFontSize: 32 });
    const textEl = screen.getByText('Hello everyone');
    expect(textEl.style.fontSize).toBe('32px');
  });

  it('clamps extreme font size within safe 14-48px range', () => {
    renderAtCueEnd(seg, { ...DEFAULT_SETTINGS, subtitleFontSize: 100 });
    const textEl = screen.getByText('Hello everyone');
    expect(textEl.style.fontSize).toBe('48px');
  });

  it('clamps minimum font size to 14px', () => {
    renderAtCueEnd(seg, { ...DEFAULT_SETTINGS, subtitleFontSize: 8 });
    const textEl = screen.getByText('Hello everyone');
    expect(textEl.style.fontSize).toBe('14px');
  });

  it('falls back to black rgba with safe opacity when invalid hex is provided', () => {
    renderAtCueEnd(seg, {
      ...DEFAULT_SETTINGS,
      subtitleBackground: 'invalid-hex',
      subtitleBackgroundOpacity: 0.5,
    });
    const overlay = screen.getByTestId('subtitle-overlay');
    const captionPanel = overlay.querySelector('div') as HTMLElement;
    expect(captionPanel.style.background).toContain('rgba(0, 0, 0, 0.5)');
  });

  it('renders caption rows without allowing browser-created extra lines', () => {
    renderAtCueEnd();
    const textEl = screen.getByText('Hello everyone');
    expect(textEl.style.whiteSpace).toBe('nowrap');
    expect(textEl.style.overflow).toBe('hidden');
  });

  it('keeps long monolingual captions to two rendered rows', () => {
    const longSegment: TranslatedSegment = {
      start: 0,
      dur: 6,
      text: 'Look how much stuff man has sent full. Don\'t know what it is. Let\'s see first. Make some this sun',
      translatedText:
        'Look how much stuff man has sent full. Don\'t know what it is. Let\'s see first. Make some this sun',
    };

    renderAtCueEnd(longSegment, {
      ...DEFAULT_SETTINGS,
      subtitleBilingual: false,
      subtitleMaxCharactersPerLine: 42,
    });

    const lines = screen.getAllByTestId('subtitle-caption-line');
    expect(lines).toHaveLength(2);
    lines.forEach((line) => expect(line.style.whiteSpace).toBe('nowrap'));
  });

  it('uses a stable full-width caption panel instead of resizing each text row', () => {
    renderAtCueEnd();
    const overlay = screen.getByTestId('subtitle-overlay');
    const captionPanel = overlay.querySelector('div') as HTMLElement;
    const textLine = screen.getByText('Hello everyone');

    expect(captionPanel.style.width).toBe('100%');
    expect(captionPanel.style.background).toContain('rgba(0, 0, 0, 0.75)');
    expect(textLine.style.background).toBe('');
  });
});
