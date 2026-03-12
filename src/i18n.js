import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ko from "./locales/ko/common.json";
import en from "./locales/en/common.json";

function detectLanguage() {
  const browserLanguage = (navigator.language || "en").toLowerCase();
  return browserLanguage.startsWith("ko") ? "ko" : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en }
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;