export function isSoundLabel(text: string): boolean {
  return /^\s*[\[（(].+[\]）)]\s*$/.test(text);
}
