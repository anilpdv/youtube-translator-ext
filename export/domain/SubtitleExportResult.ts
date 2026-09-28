export interface SubtitleExportResult {
  readonly format: 'srt';
  readonly filename: string;
  readonly content: string;
  readonly cueCount: number;
}
