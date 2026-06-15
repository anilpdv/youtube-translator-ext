import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Search, X } from 'lucide-react';
import type { TranslatedSegment } from '../utils/types';

interface Props {
  segments: TranslatedSegment[];
  activeIndex: number;
  onSeek: (seconds: number) => void;
  onClose: () => void;
  onDownload: () => void;
}

const formatTimestamp = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const TranscriptPanel: React.FC<Props> = ({
  segments,
  activeIndex,
  onSeek,
  onClose,
  onDownload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const activeRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof activeRowRef.current?.scrollIntoView === 'function') {
      activeRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return segments
      .map((segment, index) => ({ segment, index }))
      .filter(({ segment }) => {
        if (!q) return true;
        const text = `${segment.translatedText} ${segment.text || ''}`.toLowerCase();
        return text.includes(q);
      });
  }, [segments, searchQuery]);

  return (
    <aside
      data-testid="transcript-panel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        height: '100%',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1215',
        border: '1px solid #273238',
        borderRadius: '12px',
        overflow: 'hidden',
        color: '#eef7f4',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <header style={{ padding: '14px', borderBottom: '1px solid #202a2f' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <strong style={{ fontSize: '14px', color: '#eaf3f0' }}>AI Transcript</strong>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={onDownload}
              aria-label="Download transcript"
              style={{
                width: '30px',
                height: '30px',
                border: '1px solid #273238',
                borderRadius: '7px',
                background: '#11181b',
                color: '#a9bbb6',
                display: 'inline-grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close transcript"
              style={{
                width: '30px',
                height: '30px',
                border: '1px solid #273238',
                borderRadius: '7px',
                background: '#11181b',
                color: '#a9bbb6',
                display: 'inline-grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 10px',
            borderRadius: '8px',
            background: '#121a1e',
            border: '1px solid #29363c',
          }}
        >
          <Search size={14} color="#81918d" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            placeholder="Search subtitles..."
            style={{
              width: '100%',
              border: 0,
              outline: 0,
              background: 'transparent',
              color: '#eef7f4',
              fontSize: '12px',
            }}
          />
        </label>
      </header>

      {/* Cues List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filteredRows.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#71827d', fontSize: '13px' }}>
            {searchQuery ? 'No matching cues found.' : 'No transcript cues loaded.'}
          </div>
        ) : (
          filteredRows.map(({ segment, index }) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={`${segment.start}-${index}`}
                ref={isActive ? activeRowRef : null}
                type="button"
                onClick={() => onSeek(segment.start)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr',
                  gap: '10px',
                  padding: '10px 14px',
                  border: 0,
                  borderLeft: `3px solid ${isActive ? '#37a889' : 'transparent'}`,
                  borderBottom: '1px solid #1c2529',
                  background: isActive ? 'rgba(36, 126, 102, 0.16)' : 'transparent',
                  color: '#dce8e4',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    font: '500 11px ui-monospace, SFMono-Regular, monospace',
                    color: isActive ? '#59c7a9' : '#778985',
                    paddingTop: '2px',
                  }}
                >
                  {formatTimestamp(segment.start)}
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: '13px', lineHeight: 1.45 }}>
                    {segment.translatedText}
                  </span>
                  {segment.text && segment.text !== segment.translatedText && (
                    <span style={{ display: 'block', marginTop: '3px', fontSize: '11px', color: '#7f908c' }}>
                      {segment.text}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: '9px 14px',
          borderTop: '1px solid #202a2f',
          font: '500 11px ui-monospace, SFMono-Regular, monospace',
          color: '#81918d',
        }}
      >
        {segments.length} {segments.length === 1 ? 'cue' : 'cues'}
      </footer>
    </aside>
  );
};
