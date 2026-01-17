import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend) // Load translations from /public/locales
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: 'ro', // Default to Romanian
    supportedLngs: ['ro', 'en', 'it'],
    debug: process.env.NODE_ENV === 'development',

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    react: {
      useSuspense: true,
    },

    // Default namespace
    defaultNS: 'common',
    ns: [
      'common',
      'auth',
      'session',
      'sidebar',
      'dashboard',
      'decks',
      'globalDecks',
      'settings',
      'achievements',
      'leaderboard',
    ],
  });

export default i18n;
