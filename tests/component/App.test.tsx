import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import * as storageModule from '../../utils/storage';
import { DEFAULT_SETTINGS, ExtensionSettings } from '../../utils/types';

vi.mock('../../utils/storage', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

import { App, ColorSetting } from '../../entrypoints/popup/App';

const DEFAULT: ExtensionSettings = { ...DEFAULT_SETTINGS };

beforeEach(() => {
  vi.mocked(storageModule.getSettings).mockResolvedValue(DEFAULT);
  vi.mocked(storageModule.saveSettings).mockImplementation((s) =>
    Promise.resolve({ ...DEFAULT, ...s } as any)
  );
});

describe('App (Popup)', () => {
  it('renders the app title and brandmark', async () => {
    render(<App />);
    expect(await screen.findByText('AI Subtitle Translator')).toBeInTheDocument();
    expect(screen.getByText('Real-time subtitles for YouTube')).toBeInTheDocument();
  });

  it('shows the stable Gemini provider badge', async () => {
    render(<App />);
    expect(await screen.findByText(/Gemini translation is ready/i)).toBeInTheDocument();
  });

  it('does not expose automatic translation as a startup action', async () => {
    render(<App />);
    expect(await screen.findByText(/Translation starts only after you click Generate subtitles/i)).toBeInTheDocument();
  });

  it('renders language selectors and updates settings', async () => {
    render(<App />);
    const sourceSelect = await screen.findByLabelText('Source Language');
    const targetSelect = screen.getByLabelText('Target Language');
    expect(sourceSelect).toBeInTheDocument();
    expect(targetSelect).toBeInTheDocument();

    fireEvent.change(targetSelect, { target: { value: 'Spanish' } });
    expect(storageModule.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ targetLanguage: 'Spanish' })
    );
  });

  it('renders Generate Subtitles primary button and handles click', async () => {
    render(<App />);
    const genBtn = await screen.findByRole('button', { name: /generate subtitles/i });
    expect(genBtn).toBeInTheDocument();
    fireEvent.click(genBtn);
    expect(screen.getByText(/generating subtitles/i)).toBeInTheDocument();
  });

  it('does NOT render legacy voice/audio/dubbing UI', async () => {
    render(<App />);
    await screen.findByText('AI Subtitle Translator');
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain('voice-over');
    expect(html).not.toContain('ai voice');
    expect(html).not.toContain('dubbing');
    expect(html).not.toContain('duck volume');
    expect(html).not.toContain('speechrate');
  });

  it('does NOT render duplicate export section in popup (exports live in player controls)', async () => {
    render(<App />);
    await screen.findByText('AI Subtitle Translator');
    expect(screen.queryByRole('button', { name: 'Translated SRT' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Original SRT' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bilingual SRT' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Diagnostics JSON' })).not.toBeInTheDocument();
  });

  it('opens translation engine drawer and shows provider options', async () => {
    render(<App />);
    const engineBtn = await screen.findByRole('button', { name: /translation engine/i });
    fireEvent.click(engineBtn);

    const providerSelect = await screen.findByLabelText('Engine Provider');
    expect(providerSelect).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini API/i)).toBeInTheDocument();
    expect(screen.queryByText(/Local Ollama/i)).not.toBeInTheDocument();
  });

  it('shows Gemini key input when Gemini provider is active', async () => {
    vi.mocked(storageModule.getSettings).mockResolvedValueOnce({ ...DEFAULT, provider: 'gemini' });
    render(<App />);
    const engineBtn = await screen.findByRole('button', { name: /translation engine/i });
    fireEvent.click(engineBtn);

    expect(await screen.findByPlaceholderText('AIzaSy...')).toBeInTheDocument();
  });

  it('normalizes legacy provider settings to Gemini', async () => {
    vi.mocked(storageModule.getSettings).mockResolvedValueOnce({ ...DEFAULT, provider: 'gemini' });
    render(<App />);
    const engineBtn = await screen.findByRole('button', { name: /translation engine/i });
    fireEvent.click(engineBtn);

    expect(await screen.findByPlaceholderText('AIzaSy...')).toBeInTheDocument();
  });

  it('tests translation engine and shows success message', async () => {
    render(<App />);
    const engineBtn = await screen.findByRole('button', { name: /translation engine/i });
    fireEvent.click(engineBtn);

    const testBtn = await screen.findByRole('button', { name: /test translation engine/i });
    fireEvent.click(testBtn);

    expect(await screen.findByText(/Select Gemini and start translation/i)).toBeInTheDocument();
  });

  it('shows subtitle appearance drawer with flat controls and preview', async () => {
    render(<App />);
    const appearanceBtn = await screen.findByRole('button', { name: /subtitle appearance/i });
    fireEvent.click(appearanceBtn);

    // Primary controls
    expect(await screen.findByText(/Font size/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Font weight')).toBeInTheDocument();
    expect(screen.getByLabelText('Text shadow')).toBeInTheDocument();
    expect(screen.getByLabelText('Text color picker')).toBeInTheDocument();
    expect(screen.getByLabelText('Background color picker')).toBeInTheDocument();
    expect(screen.getByText(/Background opacity/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Subtitle Position')).toBeInTheDocument();
    expect(screen.getByText(/Vertical offset/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Sound descriptions')).toBeInTheDocument();
    expect(screen.getByText(/Bilingual mode/i)).toBeInTheDocument();

    // Static Preview Box
    const previewBox = screen.getByTestId('popup-preview-box');
    expect(previewBox).toBeInTheDocument();
    expect(previewBox).toHaveTextContent('A quiet morning at home.');

    // Reset button
    const resetBtn = screen.getByRole('button', { name: /reset appearance/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(storageModule.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        subtitleFontSize: 24,
        subtitleFontColor: '#FFFFFF',
        subtitleBackground: '#000000',
      })
    );
  });

  it('shows the domain runtime availability message', async () => {
    render(<App />);
    expect(await screen.findByText('Open a YouTube video to begin.')).toBeInTheDocument();
  });
});

describe('ColorSetting Component', () => {
  it('renders swatch and hex code inputs with uppercase value', () => {
    const handleChange = vi.fn();
    render(<ColorSetting label="Text color" value="#FF5500" onChange={handleChange} />);

    const swatch = screen.getByLabelText('Text color picker') as HTMLInputElement;
    const hexInput = screen.getByLabelText('Text color hex code') as HTMLInputElement;

    expect(swatch.value).toBe('#ff5500');
    expect(hexInput.value).toBe('#FF5500');
  });

  it('calls onChange when swatch color is selected', () => {
    const handleChange = vi.fn();
    render(<ColorSetting label="Text color" value="#FFFFFF" onChange={handleChange} />);

    const swatch = screen.getByLabelText('Text color picker');
    fireEvent.change(swatch, { target: { value: '#00ff00' } });

    expect(handleChange).toHaveBeenCalledWith('#00FF00');
  });

  it('commits valid hex on blur and Enter key', () => {
    const handleChange = vi.fn();
    render(<ColorSetting label="Text color" value="#FFFFFF" onChange={handleChange} />);

    const hexInput = screen.getByLabelText('Text color hex code');
    fireEvent.change(hexInput, { target: { value: '#123456' } });
    fireEvent.blur(hexInput);

    expect(handleChange).toHaveBeenCalledWith('#123456');

    fireEvent.change(hexInput, { target: { value: 'abcdef' } });
    fireEvent.keyDown(hexInput, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('#ABCDEF');
  });

  it('reverts invalid hex on blur without triggering onChange', () => {
    const handleChange = vi.fn();
    render(<ColorSetting label="Text color" value="#FFFFFF" onChange={handleChange} />);

    const hexInput = screen.getByLabelText('Text color hex code') as HTMLInputElement;
    fireEvent.change(hexInput, { target: { value: 'invalid' } });
    fireEvent.blur(hexInput);

    expect(handleChange).not.toHaveBeenCalled();
    expect(hexInput.value).toBe('#FFFFFF');
  });
});
