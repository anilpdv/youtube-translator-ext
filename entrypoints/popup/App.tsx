import React, { useEffect, useState } from 'react';
import {
  Captions,
  ChevronDown,
  Languages,
  LoaderCircle,
  Settings2,
  Sparkles,
  TestTube2,
  Sliders,
} from 'lucide-react';
import { getSettings, saveSettings } from '../../settings/BrowserSettingsRepository';
import { DEFAULT_SETTINGS } from '../../settings/DefaultSettings';
import type { ExtensionSettings } from '../../settings/ExtensionSettings';
import { PopupController } from '../../popup/app/PopupController';
import { PopupRuntimeClient } from '../../popup/messaging/PopupRuntimeClient';
import type { PopupState as DomainPopupState } from '../../popup/app/PopupState';

const SOURCE_LANGUAGES: [string, string][] = [
  ['auto', 'Auto detect'],
  ['en', 'English'],
  ['de', 'German'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['ja', 'Japanese'],
  ['hi', 'Hindi'],
  ['zh', 'Chinese'],
  ['ko', 'Korean'],
  ['ar', 'Arabic'],
  ['pt', 'Portuguese'],
  ['ru', 'Russian'],
  ['it', 'Italian'],
];

const TARGET_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Hindi',
  'Chinese',
  'Korean',
  'Arabic',
  'Portuguese',
  'Russian',
  'Italian',
];

const APPEARANCE_DEFAULTS: Partial<ExtensionSettings> = {
  subtitleFontSize: 24,
  subtitleFontWeight: 600,
  subtitleFontColor: '#FFFFFF',
  subtitleTextShadow: 'strong',
  subtitleLineHeight: 1.3,
  subtitleBackground: '#000000',
  subtitleBackgroundOpacity: 0.75,
  subtitlePosition: 'bottom',
  subtitleVerticalOffset: 0,
  subtitleMaxWidth: 82,
  subtitleAlignment: 'center',
  subtitleBilingual: false,
  bilingualOrder: 'translation-first',
  bilingualOriginalScale: 0.78,
  bilingualOriginalOpacity: 0.72,
  subtitleSoundLabels: 'show',
  subtitleSyncOffsetMs: 0,
};

const normalizeHexColor = (val: string): string => {
  const clean = val.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean}`.toUpperCase();
  return '';
};

const hexToRgba = (hex: string, alpha: number): string => {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000000';
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  const safeAlpha = Math.min(1, Math.max(0, isNaN(alpha) ? 0.75 : alpha));
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

interface ColorSettingProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

export const ColorSetting: React.FC<ColorSettingProps> = ({ label, value, onChange }) => {
  const safeValue = normalizeHexColor(value) || '#FFFFFF';
  const [draft, setDraft] = useState<string>(safeValue);

  useEffect(() => {
    setDraft(safeValue);
  }, [safeValue]);

  const commitDraft = () => {
    const norm = normalizeHexColor(draft);
    if (norm) {
      onChange(norm);
    } else {
      setDraft(safeValue);
    }
  };

  return (
    <div className="color-setting-row">
      <span>{label}</span>
      <div className="color-inputs">
        <input
          type="color"
          aria-label={`${label} picker`}
          className="color-swatch"
          value={safeValue}
          onChange={(e) => {
            const hex = e.target.value.toUpperCase();
            setDraft(hex);
            onChange(hex);
          }}
        />
        <input
          type="text"
          aria-label={`${label} hex code`}
          className="color-hex"
          value={draft}
          maxLength={7}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitDraft();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    </div>
  );
};

type PopupState = 'idle' | 'working' | 'ready' | 'partial' | 'error';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [state, setState] = useState<PopupState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isEngineDrawerOpen, setIsEngineDrawerOpen] = useState<boolean>(false);
  const [isAppearanceDrawerOpen, setIsAppearanceDrawerOpen] = useState<boolean>(false);
  const [modelId, setModelId] = useState('gemini-2.5-flash');
  const [domainState, setDomainState] = useState<DomainPopupState | null>(null);
  const controllerRef = React.useRef<PopupController | null>(null);

  useEffect(() => {
    getSettings().then((loaded) => setSettings(loaded));
    const controller = new PopupController(new PopupRuntimeClient());
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe((next) => {
      setDomainState(next);
      setStatusMessage(next.message || next.providerMessage || '');
      setState(
        next.status === 'completed' ? 'ready' :
        next.status === 'partially-completed' ? 'partial' :
        next.status === 'failed' || next.status === 'unavailable' ? 'error' :
        next.status === 'translating' || next.status === 'loading-captions' ? 'working' : 'idle',
      );
      setSettings((current) => ({ ...current, autoTranslate: next.subtitlesEnabled }));
    });
    void controller.start();
    return () => {
      unsubscribe();
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const handleSettingChange = <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    saveSettings({ [key]: value });
    const displayPatch =
      key === 'subtitleBackgroundOpacity' ? { backgroundOpacity: Number(value) } :
      key === 'subtitleSyncOffsetMs' ? { syncOffsetMs: Number(value) } :
      key === 'subtitleBilingual' ? { mode: (value ? 'bilingual' : 'translated') as 'bilingual' | 'translated' } :
      null;
    if (displayPatch) {
      void controllerRef.current?.updateSubtitleSettings(displayPatch).catch(() => {});
    }
  };

  const handleGenerate = () => {
    setState('working');
    setStatusMessage('Preparing subtitles…');
    const current = domainState;
    if (!current) return;
    const captionTrackId =
      current.selectedCaptionTrackId || current.captionTracks[0]?.id;
    void controllerRef.current?.startTranslation({
      ...(captionTrackId ? { captionTrackId } : {}),
      targetLanguage: settings.targetLanguage,
      providerId: 'gemini',
      modelId,
    }).catch((error: unknown) => {
      setState('error');
      setStatusMessage(error instanceof Error ? error.message : 'Translation failed.');
    });
  };

  const handleTestEngine = () => {
    setStatusMessage('Select Gemini and start translation from the active YouTube video.');
  };

  // Stable V1 uses one provider route. Credentials remain background-only.
  const getPrivacyText = () => {
    return { label: 'Gemini Cloud API', desc: 'Translation is sent to Google Gemini after explicit activation.' };
  };

  const privacy = getPrivacyText();

  return (
    <main className="popup-shell">
      {/* Top Bar Header */}
      <header className="topbar">
        <div className="brandmark">A<sup>+</sup></div>
        <div>
          <h1>AI Subtitle Translator</h1>
          <p>Real-time subtitles for YouTube</p>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Settings"
          aria-expanded={isEngineDrawerOpen}
          onClick={() => setIsEngineDrawerOpen((prev) => !prev)}
        >
          <Settings2 />
        </button>
      </header>

      {/* Provider status banner */}
      <section className="notice ok">
        <span className="status-dot" />
        <div>
          <strong>Gemini translation is ready</strong>
          <p>Translation starts only after you click Generate subtitles.</p>
        </div>
      </section>

      {/* Language Selection Grid */}
      <section className="panel">
        <div className="section-title">
          <Languages />
          <span>Languages</span>
        </div>
        <div className="language-grid">
          <label>
            Video language
            <select
              aria-label="Source Language"
              value={settings.sourceLanguage}
              onChange={(e) => handleSettingChange('sourceLanguage', e.target.value)}
            >
              {SOURCE_LANGUAGES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <span className="arrow" aria-hidden="true">→</span>
          <label>
            Translate to
            <select
              aria-label="Target Language"
              value={settings.targetLanguage}
              onChange={(e) => handleSettingChange('targetLanguage', e.target.value)}
            >
              {TARGET_LANGUAGES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Primary Action Button */}
      <button
        type="button"
        className="primary"
        disabled={state === 'working'}
        onClick={handleGenerate}
      >
        {state === 'working' ? <LoaderCircle className="spin" /> : <Sparkles />}
        <span>
          {state === 'working' ? 'Generating subtitles…' : 'Generate subtitles'}
          <small>Transcribe and synchronize subtitles on this video</small>
        </span>
      </button>

      {/* Status / Error Message */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`message ${state === 'error' ? 'error' : state === 'ready' ? 'ready' : ''}`}
        >
          {statusMessage}
        </div>
      )}

      {/* Subtitle Visibility Toggle */}
      <button
        type="button"
        aria-pressed={settings.autoTranslate}
        className={`toggle-row ${settings.autoTranslate ? 'active' : ''}`}
        onClick={() => {
          const enabled = !settings.autoTranslate;
          setSettings((current) => ({ ...current, autoTranslate: enabled }));
          void controllerRef.current?.setSubtitlesEnabled(enabled).catch((error: unknown) => {
            setStatusMessage(error instanceof Error ? error.message : 'Could not update subtitles.');
          });
        }}
      >
        <span>
          <Captions />
          Show subtitles on video
        </span>
        <i />
      </button>

      {/* Subtitle Appearance Section (Relocated above Engine) */}
      <section className="panel compact">
        <button
          type="button"
          aria-expanded={isAppearanceDrawerOpen}
          className="section-button"
          onClick={() => setIsAppearanceDrawerOpen((prev) => !prev)}
        >
          <span>
            <Sliders />
            Subtitle appearance
          </span>
          <ChevronDown className={isAppearanceDrawerOpen ? 'rotate' : ''} />
        </button>

        {isAppearanceDrawerOpen && (
          <div className="drawer">
            {/* Primary Controls */}
            <label>
              Font size <b>{settings.subtitleFontSize}px</b>
              <input
                type="range"
                min="14"
                max="48"
                step="2"
                value={settings.subtitleFontSize}
                onChange={(e) => handleSettingChange('subtitleFontSize', Number(e.target.value))}
              />
            </label>

            <label>
              Font weight
              <select
                aria-label="Font weight"
                value={settings.subtitleFontWeight}
                onChange={(e) => handleSettingChange('subtitleFontWeight', Number(e.target.value) as any)}
              >
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
              </select>
            </label>

            <label>
              Text shadow
              <select
                aria-label="Text shadow"
                value={settings.subtitleTextShadow}
                onChange={(e) => handleSettingChange('subtitleTextShadow', e.target.value as any)}
              >
                <option value="none">None</option>
                <option value="soft">Soft</option>
                <option value="strong">Strong (High Contrast)</option>
              </select>
            </label>

            <ColorSetting
              label="Text color"
              value={settings.subtitleFontColor}
              onChange={(hex) => handleSettingChange('subtitleFontColor', hex)}
            />

            <ColorSetting
              label="Background color"
              value={settings.subtitleBackground}
              onChange={(hex) => handleSettingChange('subtitleBackground', hex)}
            />

            <label>
              Background opacity <b>{Math.round(settings.subtitleBackgroundOpacity * 100)}%</b>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.subtitleBackgroundOpacity}
                onChange={(e) => handleSettingChange('subtitleBackgroundOpacity', Number(e.target.value))}
              />
            </label>

            <label>
              Subtitle Position
              <select
                aria-label="Subtitle Position"
                value={settings.subtitlePosition}
                onChange={(e) => handleSettingChange('subtitlePosition', e.target.value as any)}
              >
                <option value="bottom">Bottom</option>
                <option value="top">Top</option>
              </select>
            </label>

            <label>
              Vertical offset <b>{settings.subtitleVerticalOffset}px</b>
              <input
                type="range"
                min="-120"
                max="120"
                step="5"
                value={settings.subtitleVerticalOffset}
                onChange={(e) => handleSettingChange('subtitleVerticalOffset', Number(e.target.value))}
              />
            </label>

            <label>
              Sound descriptions
              <select
                aria-label="Sound descriptions"
                value={settings.subtitleSoundLabels}
                onChange={(e) => handleSettingChange('subtitleSoundLabels', e.target.value as any)}
              >
                <option value="show">Translate & Show</option>
                <option value="original-only">Show Original</option>
                <option value="hide">Hide Sound Labels</option>
              </select>
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={settings.subtitleBilingual}
                onChange={(e) => handleSettingChange('subtitleBilingual', e.target.checked)}
              />
              <span>Bilingual mode (show source & translation)</span>
            </label>

            {settings.subtitleBilingual && (
              <label>
                Bilingual order
                <select
                  aria-label="Bilingual order"
                  value={settings.bilingualOrder}
                  onChange={(e) => handleSettingChange('bilingualOrder', e.target.value as any)}
                >
                  <option value="translation-first">Translation First (Prominent)</option>
                  <option value="original-first">Original First</option>
                </select>
              </label>
            )}

            {/* Collapsible Advanced Options */}
            <details className="more-options">
              <summary>More options</summary>
              <div style={{ display: 'grid', gap: '9px', paddingTop: '6px' }}>
                <label>
                  Line height <b>{settings.subtitleLineHeight}</b>
                  <input
                    type="range"
                    min="1.1"
                    max="1.8"
                    step="0.05"
                    value={settings.subtitleLineHeight}
                    onChange={(e) => handleSettingChange('subtitleLineHeight', Number(e.target.value))}
                  />
                </label>

                <label>
                  Max width <b>{settings.subtitleMaxWidth}%</b>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    step="2"
                    value={settings.subtitleMaxWidth}
                    onChange={(e) => handleSettingChange('subtitleMaxWidth', Number(e.target.value))}
                  />
                </label>

                <label>
                  Text alignment
                  <select
                    aria-label="Text alignment"
                    value={settings.subtitleAlignment}
                    onChange={(e) => handleSettingChange('subtitleAlignment', e.target.value as any)}
                  >
                    <option value="center">Center</option>
                    <option value="left">Left</option>
                  </select>
                </label>

                <label>
                  Sync offset <b>{(settings.subtitleSyncOffsetMs / 1000).toFixed(1)} s</b>
                  <input
                    type="range"
                    min="-3000"
                    max="3000"
                    step="100"
                    value={settings.subtitleSyncOffsetMs}
                    onChange={(e) => handleSettingChange('subtitleSyncOffsetMs', Number(e.target.value))}
                  />
                </label>
              </div>
            </details>

            {/* Live Static Preview Box */}
            <div
              className="preview-box"
              data-testid="popup-preview-box"
              style={{
                backgroundColor: hexToRgba(settings.subtitleBackground, settings.subtitleBackgroundOpacity),
                color: settings.subtitleFontColor || '#FFFFFF',
                fontSize: `${Math.min(settings.subtitleFontSize, 28)}px`,
                fontWeight: settings.subtitleFontWeight || 600,
                textShadow: getTextShadow(settings.subtitleTextShadow),
                lineHeight: settings.subtitleLineHeight || 1.3,
                textAlign: settings.subtitleAlignment || 'center',
              }}
            >
              A quiet morning at home.
            </div>

            {/* Reset Appearance Button */}
            <button
              type="button"
              className="secondary"
              style={{ marginTop: '6px' }}
              onClick={() => {
                setSettings((prev) => ({ ...prev, ...APPEARANCE_DEFAULTS }));
                saveSettings(APPEARANCE_DEFAULTS);
              }}
            >
              Reset appearance
            </button>
          </div>
        )}
      </section>

      {/* Translation Engine Disclosure */}
      <section className="panel compact">
        <button
          type="button"
          aria-expanded={isEngineDrawerOpen}
          className="section-button"
          onClick={() => setIsEngineDrawerOpen((prev) => !prev)}
        >
          <span>
            <TestTube2 />
            Translation engine
          </span>
          <ChevronDown className={isEngineDrawerOpen ? 'rotate' : ''} />
        </button>

        {isEngineDrawerOpen && (
          <div className="drawer">
            <label>
              Engine Provider
              <select
                aria-label="Engine Provider"
                value={settings.provider}
                onChange={(e) => handleSettingChange('provider', e.target.value as any)}
              >
                <option value="gemini">Google Gemini API</option>
              </select>
            </label>

            {settings.provider === 'gemini' && (
              <>
                <label>
                  Gemini model
                  <select aria-label="Gemini model" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </select>
                </label>
                <label>
                  Gemini API Key
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={settings.apiKey}
                    onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                  />
                </label>
              </>
            )}

            <button type="button" className="secondary" onClick={handleTestEngine}>
              Test translation engine
            </button>
          </div>
        )}
      </section>

      {/* Footer Privacy Info */}
      <footer>
        <span>{privacy.desc}</span>
        <span className="local">{privacy.label}</span>
      </footer>
    </main>
  );
};
export default App;
