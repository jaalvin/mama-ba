import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext(null);

/** Bilingual string helper — pass { en, twi } and get the right string. */
export function t(strings, lang) {
  return lang === "twi" ? strings.twi : strings.en;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("mama_ba_lang") || "en";
  });

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem("mama_ba_lang", l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
