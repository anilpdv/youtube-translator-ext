import type { TranslationDocument } from '../../translation/domain/TranslationDocument';
import type { SubtitleExportResult } from '../domain/SubtitleExportResult';
import { ExportError } from '../domain/ExportError';
import { formatSrtTimestamp } from './formatSrtTimestamp';
import { sanitizeSrtText } from './sanitizeSrtText';

export class SrtExporter {
  export(document: TranslationDocument): SubtitleExportResult {
    const cues = document.cues
      .filter((cue) => sanitizeSrtText(cue.translatedText).length > 0)
      .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
    if (!cues.length) throw new ExportError('EXPORT_EMPTY', 'There are no translated subtitles to export.');
    const content = `${cues.map((cue, index) => [
      String(index + 1),
      `${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}`,
      sanitizeSrtText(cue.translatedText),
    ].join('\n')).join('\n\n')}\n`;
    return { format: 'srt', filename: `${document.videoId}-${document.targetLanguage}.srt`, content, cueCount: cues.length };
  }
}
