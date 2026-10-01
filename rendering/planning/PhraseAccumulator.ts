import { countReadingUnits, estimateCaptionLines, joinCaptionUnits } from './joinCaptionUnits';

export interface TimedTextUnit {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly parentCueId: string;
}

export interface PhraseAccumulatorSnapshot {
  readonly units: readonly TimedTextUnit[];
  readonly text: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
  readonly wordCount: number;
  readonly characterCount: number;
  readonly estimatedLines: number;
}

export class PhraseAccumulator {
  private units: TimedTextUnit[] = [];

  add(unit: TimedTextUnit): void {
    this.units.push(unit);
  }

  snapshot(maximumCharactersPerLine: number): PhraseAccumulatorSnapshot {
    return this.snapshotFor(this.units, maximumCharactersPerLine);
  }

  snapshotThrough(unitIndex: number, maximumCharactersPerLine: number): PhraseAccumulatorSnapshot {
    return this.snapshotFor(this.units.slice(0, unitIndex + 1), maximumCharactersPerLine);
  }

  getUnits(): readonly TimedTextUnit[] {
    return this.units;
  }

  commitThrough(unitIndex: number): readonly TimedTextUnit[] {
    const committed = this.units.slice(0, unitIndex + 1);
    this.units = this.units.slice(unitIndex + 1);
    return committed;
  }

  clear(): void {
    this.units = [];
  }

  isEmpty(): boolean {
    return this.units.length === 0;
  }

  private snapshotFor(
    units: readonly TimedTextUnit[],
    maximumCharactersPerLine: number,
  ): PhraseAccumulatorSnapshot {
    const text = joinCaptionUnits(units);
    const startMs = units[0]?.startMs ?? 0;
    const endMs = units.at(-1)?.endMs ?? 0;

    return {
      units: [...units],
      text,
      startMs,
      endMs,
      durationMs: endMs - startMs,
      wordCount: countReadingUnits(text),
      characterCount: text.length,
      estimatedLines: estimateCaptionLines(text, maximumCharactersPerLine),
    };
  }
}
