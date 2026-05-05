export type ThemePreset = 'dark' | 'light';
export type PersonaMode = 'creative' | 'precise' | 'fast';

const THEME_KEY = 'themePreset';
const PERSONA_KEY = 'personaMode';

export function getThemePreset(): ThemePreset {
  if (typeof window === 'undefined') return 'dark';
  const value = localStorage.getItem(THEME_KEY);
  if (value === 'dark' || value === 'light') {
    return value;
  }
  return 'dark';
}

export function setThemePreset(theme: ThemePreset): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
}

export function getPersonaMode(): PersonaMode {
  if (typeof window === 'undefined') return 'precise';
  const value = localStorage.getItem(PERSONA_KEY);
  if (value === 'creative' || value === 'precise' || value === 'fast') {
    return value;
  }
  return 'precise';
}

export function setPersonaMode(mode: PersonaMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PERSONA_KEY, mode);
}

export function applyThemeClass(theme: ThemePreset): void {
  if (typeof document === 'undefined') return;
  const body = document.body;
  body.classList.remove('theme-light');
  if (theme === 'light') body.classList.add('theme-light');
}
