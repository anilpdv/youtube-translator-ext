import type { TranslationDocument } from '../../translation/domain/TranslationDocument';
import { SrtExporter } from '../srt/SrtExporter';
import { SubtitleDownloadService } from '../download/SubtitleDownloadService';

export class SubtitleExportService {
  constructor(
    private readonly exporter = new SrtExporter(),
    private readonly downloader = new SubtitleDownloadService(),
  ) {}

  exportAndDownload(document: TranslationDocument): void {
    const result = this.exporter.export(document);
    this.downloader.download(result.content, result.filename);
  }

  export(document: TranslationDocument) {
    return this.exporter.export(document);
  }
}
