import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en';
import ar from './ar';
import fr from './fr';

const i18n = new I18n({ en, ar, fr });

i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Detect device locale
const deviceLocale = getLocales()[0]?.languageCode || 'en';
i18n.locale = ['en', 'ar', 'fr'].includes(deviceLocale) ? deviceLocale : 'en';

const LANG_KEY = '@app_language';

export async function loadSavedLanguage() {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved && ['en', 'ar', 'fr'].includes(saved)) {
      i18n.locale = saved;
    }
  } catch { /* ignore */ }
}

export async function setLanguage(lang: string) {
  i18n.locale = lang;
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch { /* ignore */ }
}

export function isRTL() {
  return i18n.locale === 'ar';
}

export function t(key: string, options?: Record<string, any>) {
  return i18n.t(key, options);
}

export default i18n;
