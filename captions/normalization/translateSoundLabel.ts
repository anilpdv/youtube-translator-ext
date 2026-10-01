const SOUND_LABEL_DICTIONARY: Record<string, string> = {
  '[ため息]': '[Sighing]', '[息遣い]': '[Breathing]', '[拍手]': '[Applause]',
  '[笑い]': '[Laughter]', '[笑い声]': '[Laughter]', '[泣き声]': '[Crying]',
  '[沈黙]': '[Silence]', '[音楽]': '[Music]', '[鼻息]': '[Snorting]',
  '（ため息）': '(Sighing)', '（息遣い）': '(Breathing)', '（拍手）': '(Applause)',
  '（笑い）': '(Laughter)', '（笑い声）': '(Laughter)', '（泣き声）': '(Crying)',
  '（沈黙）': '(Silence)', '（音楽）': '(Music)', '（鼻息）': '(Snorting)',
};

export function translateSoundLabel(text: string): string {
  const trimmed = text.trim();
  return SOUND_LABEL_DICTIONARY[trimmed] ?? trimmed;
}
