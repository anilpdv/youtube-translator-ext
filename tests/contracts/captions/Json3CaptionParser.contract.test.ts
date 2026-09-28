import { Json3CaptionParser } from '../../../captions/parsing/Json3CaptionParser';
import { runCaptionParserContract } from './CaptionParser.contract';

runCaptionParserContract('JSON3', new Json3CaptionParser(), JSON.stringify({
  events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'Hello' }] }],
}));
