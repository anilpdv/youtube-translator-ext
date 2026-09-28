const RTL_LANGUAGE_CODES = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'yi']);

export function getLanguageDirection(languageCode: string): 'ltr' | 'rtl' {
  return RTL_LANGUAGE_CODES.has(languageCode.toLowerCase().split('-')[0]) ? 'rtl' : 'ltr';
}
