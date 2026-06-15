import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptPanel } from '../../components/TranscriptPanel';
import type { TranslatedSegment } from '../../utils/types';

describe('TranscriptPanel Component', () => {
  const sampleSegments: TranslatedSegment[] = [
    { start: 0, dur: 3.5, text: 'Hello world', translatedText: 'Bonjour le monde' },
    { start: 4.0, dur: 4.2, text: 'This is a test', translatedText: 'Ceci est un test' },
    { start: 8.5, dur: 3.0, text: 'Final cue', translatedText: 'Dernier indice' },
  ];

  it('renders all transcript segments with timestamps', () => {
    render(
      <TranscriptPanel
        segments={sampleSegments}
        activeIndex={0}
        onSeek={vi.fn()}
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    expect(screen.getByText('Bonjour le monde')).toBeInTheDocument();
    expect(screen.getByText('Ceci est un test')).toBeInTheDocument();
    expect(screen.getByText('Dernier indice')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('00:04')).toBeInTheDocument();
    expect(screen.getByText('3 cues')).toBeInTheDocument();
  });

  it('calls onSeek when a cue row is clicked', () => {
    const handleSeek = vi.fn();
    render(
      <TranscriptPanel
        segments={sampleSegments}
        activeIndex={0}
        onSeek={handleSeek}
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    const secondCue = screen.getByText('Ceci est un test');
    fireEvent.click(secondCue);
    expect(handleSeek).toHaveBeenCalledWith(4.0);
  });

  it('filters transcript cues when user types in search input', () => {
    render(
      <TranscriptPanel
        segments={sampleSegments}
        activeIndex={0}
        onSeek={vi.fn()}
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search subtitles...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(screen.getByText('Ceci est un test')).toBeInTheDocument();
    expect(screen.queryByText('Bonjour le monde')).not.toBeInTheDocument();
  });

  it('fires onClose and onDownload callbacks', () => {
    const handleClose = vi.fn();
    const handleDownload = vi.fn();

    render(
      <TranscriptPanel
        segments={sampleSegments}
        activeIndex={0}
        onSeek={vi.fn()}
        onClose={handleClose}
        onDownload={handleDownload}
      />
    );

    const closeBtn = screen.getByLabelText('Close transcript');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const downloadBtn = screen.getByLabelText('Download transcript');
    fireEvent.click(downloadBtn);
    expect(handleDownload).toHaveBeenCalledTimes(1);
  });
});
