/**
 * Language code → full English name and flag emoji for display.
 * Used in dropdowns and headers so users see e.g. "German 🇩🇪" not "de".
 */
export interface LanguageDisplay {
  name: string;
  flag: string;
}

const LANGUAGE_MAP: Record<string, LanguageDisplay> = {
  ar: { name: 'Arabic', flag: '🇸🇦' },
  de: { name: 'German', flag: '🇩🇪' },
  el: { name: 'Greek', flag: '🇬🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  hi: { name: 'Hindi', flag: '🇮🇳' },
  it: { name: 'Italian', flag: '🇮🇹' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
  ko: { name: 'Korean', flag: '🇰🇷' },
  nl: { name: 'Dutch', flag: '🇳🇱' },
  pl: { name: 'Polish', flag: '🇵🇱' },
  pt: { name: 'Portuguese', flag: '🇵🇹' },
  ru: { name: 'Russian', flag: '🇷🇺' },
  sv: { name: 'Swedish', flag: '🇸🇪' },
  tr: { name: 'Turkish', flag: '🇹🇷' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
};

/** Get display name and flag for a language code. Unknown codes get a capitalised code and 🌐. */
export function getLanguageDisplay(code: string): LanguageDisplay {
  if (!code || typeof code !== 'string') {
    return { name: '—', flag: '🌐' };
  }
  const key = code.trim().toLowerCase();
  const known = LANGUAGE_MAP[key];
  if (known) return known;
  const name = key.length >= 2 ? key.charAt(0).toUpperCase() + key.slice(1) : key.toUpperCase();
  return { name, flag: '🌐' };
}

/** Single line label for dropdowns/headers: "🇩🇪 German". */
export function getLanguageLabel(code: string): string {
  const { flag, name } = getLanguageDisplay(code);
  return `${flag} ${name}`;
}
