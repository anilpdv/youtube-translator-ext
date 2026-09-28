export function languageInstruction(
  sourceLanguage: string,
  targetLanguage: string,
): string {
  return `Translate from ${sourceLanguage} to ${targetLanguage}. Preserve meaning, tone, and cue boundaries.`;
}
