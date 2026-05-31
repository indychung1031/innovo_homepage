import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { i18nResources } from './resources';

void i18n.use(initReactI18next).init({
  resources: i18nResources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'home', 'about', 'technology', 'products', 'contact', 'auth', 'wizard'],
  interpolation: { escapeValue: false },
});

export default i18n;
