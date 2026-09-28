import type { LogEvent } from '../domain/LogEvent';
import type { DiagnosticLimits } from '../diagnostics/DiagnosticLimits';
import type { DiagnosticEventRepository } from '../diagnostics/DiagnosticEventRepository';
import type { LogSink } from './LogSink';
export class DiagnosticLogSink implements LogSink {
  constructor(private readonly repository: DiagnosticEventRepository, private readonly limits: DiagnosticLimits) {}
  async write(event: LogEvent): Promise<void> {
    if (new TextEncoder().encode(JSON.stringify(event)).byteLength > this.limits.maxEventBytes) return;
    await this.repository.append(event);
  }
}
