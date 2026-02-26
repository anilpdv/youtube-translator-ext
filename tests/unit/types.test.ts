import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, ExtensionSettings } from '../../utils/types';

describe('types — DEFAULT_SETTINGS', () => {
  it('has youtube as default provider (free & instant sync by default)', () => {
    expect(DEFAULT_SETTINGS.provider).toBe('youtube');
  });

  it('has no hardcoded API keys', () => {
    expect(DEFAULT_SETTINGS.apiKey).toBe('');
    expect(DEFAULT_SETTINGS.openrouterKey).toBe('');
  });

  it('has valid subtitle appearance defaults', () => {
    expect(DEFAULT_SETTINGS.subtitleFontSize).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.subtitleFontColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(DEFAULT_SETTINGS.subtitleBackground).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(DEFAULT_SETTINGS.subtitleBackgroundOpacity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SETTINGS.subtitleBackgroundOpacity).toBeLessThanOrEqual(1);
    expect(['top', 'bottom']).toContain(DEFAULT_SETTINGS.subtitlePosition);
  });

  it('autoTranslate is on by default', () => {
    expect(DEFAULT_SETTINGS.autoTranslate).toBe(true);
  });

  it('no voice-related fields exist', () => {
    const s = DEFAULT_SETTINGS as any;
    expect(s.voiceOverEnabled).toBeUndefined();
    expect(s.voiceName).toBeUndefined();
    expect(s.speechRate).toBeUndefined();
    expect(s.speechPitch).toBeUndefined();
    expect(s.duckVolume).toBeUndefined();
  });

  it('ExtensionSettings satisfies required shape', () => {
    const s: ExtensionSettings = DEFAULT_SETTINGS;
    // TypeScript compile-time check satisfied — also verify runtime
    expect(typeof s.sourceLanguage).toBe('string');
    expect(typeof s.targetLanguage).toBe('string');
    expect(typeof s.subtitleBilingual).toBe('boolean');
  });
});
