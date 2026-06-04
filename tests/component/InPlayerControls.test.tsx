import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { InPlayerControls } from '../../components/InPlayerControls';
import { DEFAULT_SETTINGS } from '../../utils/types';

describe('InPlayerControls', () => {
  it('renders AI Subs button with aria-pressed', () => {
    render(
      <InPlayerControls
        settings={{ ...DEFAULT_SETTINGS, autoTranslate: true }}
        isTranslating={false}
        onToggleSubs={vi.fn()}
      />
    );
    const subBtn = screen.getByRole('button', { name: /ai subtitles/i });
    expect(subBtn).toBeInTheDocument();
    expect(subBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('does NOT render legacy voice/audio controls', () => {
    render(
      <InPlayerControls
        settings={DEFAULT_SETTINGS}
        isTranslating={false}
        onToggleSubs={vi.fn()}
      />
    );
    expect(screen.queryByText(/voice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/🎙️/)).not.toBeInTheDocument();
  });

  it('calls onToggleSubs when AI Subs button is clicked', () => {
    const toggle = vi.fn();
    render(
      <InPlayerControls
        settings={DEFAULT_SETTINGS}
        isTranslating={false}
        onToggleSubs={toggle}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /ai subtitles/i }));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('renders spinner when isTranslating is true', () => {
    const { container } = render(
      <InPlayerControls
        settings={DEFAULT_SETTINGS}
        isTranslating={true}
        onToggleSubs={vi.fn()}
      />
    );
    expect(container.querySelector('.yt-ai-spin')).toBeInTheDocument();
  });

  it('opens and closes export dropdown menu when hasSubtitles is true', () => {
    const downloadMock = vi.fn();
    render(
      <InPlayerControls
        settings={DEFAULT_SETTINGS}
        isTranslating={false}
        hasSubtitles={true}
        onToggleSubs={vi.fn()}
        onDownload={downloadMock}
      />
    );

    const exportBtn = screen.getByRole('button', { name: 'Export subtitles' });
    expect(exportBtn).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(exportBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Translated SRT')).toBeInTheDocument();
    expect(screen.getByText('Diagnostics JSON')).toBeInTheDocument();

    // Click menu item
    fireEvent.click(screen.getByText('Translated SRT'));
    expect(downloadMock).toHaveBeenCalledWith('translated');
  });

  it('toggles transcript panel when transcript button is clicked', () => {
    const toggleTranscript = vi.fn();
    render(
      <InPlayerControls
        settings={DEFAULT_SETTINGS}
        isTranslating={false}
        hasSubtitles={true}
        isTranscriptOpen={false}
        onToggleSubs={vi.fn()}
        onToggleTranscript={toggleTranscript}
      />
    );

    const transcriptBtn = screen.getByRole('button', { name: 'Toggle Transcript Panel' });
    expect(transcriptBtn).toBeInTheDocument();
    expect(transcriptBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(transcriptBtn);
    expect(toggleTranscript).toHaveBeenCalledTimes(1);
  });
});
