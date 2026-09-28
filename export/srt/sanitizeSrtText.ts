export function sanitizeSrtText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
}
