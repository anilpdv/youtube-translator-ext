import type { DiagnosticBundle } from './DiagnosticBundle';
import { sanitizeDiagnosticBundle } from './DiagnosticSanitizer';
export class DiagnosticExporter {
  constructor(private readonly collect: () => Promise<DiagnosticBundle>, private readonly maximumBytes = 2 * 1024 * 1024) {}
  async export(): Promise<{ filename: string; content: string }> {
    const content = JSON.stringify(sanitizeDiagnosticBundle(await this.collect()), null, 2);
    if (new TextEncoder().encode(content).byteLength > this.maximumBytes) throw new Error('The diagnostic bundle exceeds the allowed size.');
    return { filename: `subtitle-translator-diagnostics-${Date.now()}.json`, content };
  }
}
