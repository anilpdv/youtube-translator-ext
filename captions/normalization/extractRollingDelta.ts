import type { RollingDelta } from './RollingDelta';
import { tokenizeCaption } from './tokenizeCaption';
const normalize = (token: string) => token.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
function maximumOverlap(previous: readonly string[], current: readonly string[]): number {
  for (let length = Math.min(previous.length, current.length); length > 0; length -= 1) {
    if (previous.slice(-length).every((token, index) => token === current[index])) return length;
  }
  return 0;
}
export function extractRollingDelta(previousText: string, currentText: string, languageCode?: string): RollingDelta {
  const previous = tokenizeCaption(previousText, languageCode); const current = tokenizeCaption(currentText, languageCode);
  const p = previous.map((token) => normalize(token.text)); const c = current.map((token) => normalize(token.text));
  if (p.join('\u001f') === c.join('\u001f')) return { text: '', relationship: 'same', overlapTokenCount: current.length, overlapRatio: 1 };
  const overlap = maximumOverlap(p, c); const overlapRatio = current.length ? overlap / current.length : 0;
  if (!overlap) return { text: currentText.trim(), relationship: 'unrelated', overlapTokenCount: 0, overlapRatio: 0 };
  if (overlap >= current.length) return { text: '', relationship: 'same', overlapTokenCount: overlap, overlapRatio };
  return { text: currentText.slice(current[overlap].startIndex).trim(), relationship: overlap === previous.length ? 'extension' : 'overlap', overlapTokenCount: overlap, overlapRatio };
}
