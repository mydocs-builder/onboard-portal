import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";

// Zum Start nur Englisch. Die deutsche Fassung kommt als de.json dazu; die Sprache steht dann
// im Profil (profiles.language).
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React maskiert selbst
});

export default i18n;
