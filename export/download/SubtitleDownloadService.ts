import { ExportError } from '../domain/ExportError';

export class SubtitleDownloadService {
  download(content: string, filename: string): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      throw new ExportError('EXPORT_DOWNLOAD_FAILED', 'Downloads are unavailable in this context.');
    }
    const url = URL.createObjectURL(new Blob([content], { type: 'text/srt;charset=utf-8' }));
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    } catch (error) {
      throw new ExportError('EXPORT_DOWNLOAD_FAILED', 'Subtitle download failed.', error);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
