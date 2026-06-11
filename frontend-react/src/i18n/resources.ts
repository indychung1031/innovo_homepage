import aboutEn from '@content/i18n/about.en.json';
import aboutKo from '@content/i18n/about.ko.json';
import commonEn from '@content/i18n/common.en.json';
import commonKo from '@content/i18n/common.ko.json';
import homeEn from '@content/i18n/home.en.json';
import homeKo from '@content/i18n/home.ko.json';
import authEn from '@content/i18n/auth.en.json';
import authKo from '@content/i18n/auth.ko.json';
import wizardEn from '@content/i18n/wizard.en.json';
import wizardKo from '@content/i18n/wizard.ko.json';
import contactEn from '@content/i18n/contact.en.json';
import contactKo from '@content/i18n/contact.ko.json';
import productsEn from '@content/i18n/products.en.json';
import productsKo from '@content/i18n/products.ko.json';
import accountEn from '@content/i18n/account.en.json';
import accountKo from '@content/i18n/account.ko.json';
import quoteEn from '@content/i18n/quote.en.json';
import quoteKo from '@content/i18n/quote.ko.json';
import technologyEn from '@content/i18n/technology.en.json';
import technologyKo from '@content/i18n/technology.ko.json';
import downloadsEn from '@content/i18n/downloads.en.json';
import downloadsKo from '@content/i18n/downloads.ko.json';
import careersEn from '@content/i18n/careers.en.json';
import careersKo from '@content/i18n/careers.ko.json';

export const i18nResources = {
  en: {
    common: commonEn,
    home: homeEn,
    about: aboutEn,
    technology: technologyEn,
    products: productsEn,
    contact: contactEn,
    auth: authEn,
    wizard: wizardEn,
    quote: quoteEn,
    account: accountEn,
    downloads: downloadsEn,
    careers: careersEn,
  },
  ko: {
    common: commonKo,
    home: homeKo,
    about: aboutKo,
    technology: technologyKo,
    products: productsKo,
    contact: contactKo,
    auth: authKo,
    wizard: wizardKo,
    quote: quoteKo,
    account: accountKo,
    downloads: downloadsKo,
    careers: careersKo,
  },
} as const;
