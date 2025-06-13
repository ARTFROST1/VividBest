import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ru from './ru.json';
import en from './en.json';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
};

// Ensure locale is a valid string to avoid errors in environments where Localization.locale may be undefined
const deviceLocale: string = typeof Localization.locale === 'string' ? Localization.locale : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    // Use a safe fallback when device locale is unavailable
    lng: deviceLocale.startsWith('ru') ? 'ru' : 'en',
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 