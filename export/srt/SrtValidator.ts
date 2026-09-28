import { formatSrtTimestamp } from './formatSrtTimestamp';

export function isValidSrt(content: string): boolean {
  const blocks = content.trim().split(/\n{2,}/);
  if (!blocks.length || !blocks[0]) return false;
  return blocks.every((block) => {
    const lines = block.split('\n');
    if (lines.length < 3 || !/^\d+$/.test(lines[0])) return false;
    const match = lines[1].match(/^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/);
    if (!match || lines.slice(2).join('\n').trim().length === 0) return false;
    try {
      return formatSrtTimestamp(parseTimestamp(match[1])) === match[1] &&
        formatSrtTimestamp(parseTimestamp(match[2])) === match[2] &&
        parseTimestamp(match[2]) > parseTimestamp(match[1]);
    } catch { return false; }
  });
}

function parseTimestamp(value: string): number {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) throw new Error('Invalid SRT timestamp');
  return (+match[1] * 3600 + +match[2] * 60 + +match[3]) * 1000 + +match[4];
}
