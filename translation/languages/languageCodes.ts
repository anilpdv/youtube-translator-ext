const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: 'en', spanish: 'es', french: 'fr', german: 'de', italian: 'it',
  portuguese: 'pt', russian: 'ru', japanese: 'ja', chinese: 'zh-Hans',
  'chinese (simplified)': 'zh-Hans', 'chinese (traditional)': 'zh-Hant',
  korean: 'ko', hindi: 'hi', arabic: 'ar', bengali: 'bn', punjabi: 'pa',
  marathi: 'mr', telugu: 'te', tamil: 'ta', turkish: 'tr', vietnamese: 'vi',
  indonesian: 'id', thai: 'th', dutch: 'nl', polish: 'pl', ukrainian: 'uk',
  greek: 'el', czech: 'cs', swedish: 'sv',
};

export function getLanguageCode(language: string): string {
  if (!language) return 'en';
  const normalized = language.trim().toLowerCase();
  return LANGUAGE_NAME_TO_CODE[normalized] ?? (normalized.length === 2 ? normalized : 'en');
}
