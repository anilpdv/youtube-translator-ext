export function estimateTokens(text: string): number {
  return text ? Math.max(1, Math.ceil(text.length / 3)) : 0;
}
