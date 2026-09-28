import { CaptionError } from '../domain/CaptionError';
import type { CaptionFormat } from '../domain/CaptionFormat';
import type { CaptionParser } from './CaptionParser';

export class CaptionParserRegistry {
  private readonly parsers = new Map<CaptionFormat, CaptionParser>();

  constructor(parsers: readonly CaptionParser[]) {
    for (const parser of parsers) this.parsers.set(parser.format, parser);
  }

  get(format: CaptionFormat): CaptionParser {
    const parser = this.parsers.get(format);
    if (!parser) {
      throw new CaptionError({
        code: 'CAPTION_FORMAT_UNSUPPORTED',
        message: `Caption format "${format}" is not supported.`,
      });
    }
    return parser;
  }
}
