import React, { useEffect, useRef, useState } from 'react';
import { Captions, Download, LoaderCircle, List } from 'lucide-react';
import type { ExtensionSettings } from '../utils/types';

export type ExportMode = 'translated' | 'original' | 'bilingual' | 'json';

interface Props {
  settings: ExtensionSettings;
  isTranslating: boolean;
  hasSubtitles?: boolean;
  isTranscriptOpen?: boolean;
  onToggleSubs: () => void;
  onToggleTranscript?: () => void;
  onDownload?: (mode: ExportMode) => void;
}

export const InPlayerControls: React.FC<Props> = ({
  settings,
  isTranslating,
  hasSubtitles = false,
  isTranscriptOpen = false,
  onToggleSubs,
  onToggleTranscript,
  onDownload,
}) => {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const buttonStyle: React.CSSProperties = {
    height: 30,
    borderRadius: 7,
    border: '1px solid rgba(255, 255, 255, 0.16)',
    background: 'rgba(12, 17, 21, 0.86)',
    color: '#ecfdf5',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 9px',
    font: '600 12px system-ui, sans-serif',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const exportOptions: [ExportMode, string][] = [
    ['translated', 'Translated SRT'],
    ['original', 'Original SRT'],
    ['bilingual', 'Bilingual SRT'],
    ['json', 'Diagnostics JSON'],
  ];

  return (
    <div
      ref={hostRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        height: '100%',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
        marginRight: 8,
      }}
    >
      {/* AI Subtitle Toggle Button */}
      <button
        type="button"
        aria-label="AI Subtitles"
        aria-pressed={settings.autoTranslate}
        onClick={onToggleSubs}
        style={{
          ...buttonStyle,
          borderColor: settings.autoTranslate ? '#2a8b70' : 'rgba(255, 255, 255, 0.16)',
          background: settings.autoTranslate ? 'rgba(22, 101, 82, 0.72)' : 'rgba(12, 17, 21, 0.86)',
        }}
      >
        {isTranslating ? (
          <LoaderCircle size={14} className="yt-ai-spin" />
        ) : (
          <Captions size={15} />
        )}
        <span>AI Subs</span>
      </button>

      {/* Transcript Panel Toggle */}
      {hasSubtitles && onToggleTranscript && (
        <button
          type="button"
          aria-label="Toggle Transcript Panel"
          aria-pressed={isTranscriptOpen}
          onClick={onToggleTranscript}
          style={{
            ...buttonStyle,
            borderColor: isTranscriptOpen ? '#2a8b70' : 'rgba(255, 255, 255, 0.16)',
            background: isTranscriptOpen ? 'rgba(22, 101, 82, 0.72)' : 'rgba(12, 17, 21, 0.86)',
          }}
        >
          <List size={15} />
        </button>
      )}

      {/* Download Subtitles Dropdown */}
      {hasSubtitles && onDownload && (
        <>
          <button
            type="button"
            aria-label="Export subtitles"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            style={buttonStyle}
          >
            <Download size={15} />
          </button>

          {open && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                bottom: 38,
                width: 188,
                padding: 6,
                borderRadius: 10,
                background: '#101619',
                border: '1px solid #253136',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
                zIndex: 90,
              }}
            >
              {exportOptions.map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onDownload(mode);
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    border: 0,
                    borderRadius: 7,
                    padding: '8px 9px',
                    background: 'transparent',
                    color: '#d9e7e3',
                    textAlign: 'left',
                    font: '500 12px system-ui, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
