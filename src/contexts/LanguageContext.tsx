import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "ar" | "en";

type LanguageContextValue = {
  language: Language;
  isArabic: boolean;
  ready: boolean;
  setLanguage: (value: Language) => Promise<void>;
  t: (ar: string, en: string) => string;
};

const STORAGE_KEY = "deliveryhub_language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);

        if (active && (stored === "ar" || stored === "en")) {
          setLanguageState(stored);
        }
      } catch (error) {
        console.warn("Language restore failed", error);
      } finally {
        if (active) setReady(true);
      }
    }

    void restore();

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (value: Language) => {
    await AsyncStorage.setItem(STORAGE_KEY, value);
    setLanguageState(value);
  }, []);

  const t = useCallback(
    (ar: string, en: string) => (language === "ar" ? ar : en),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      isArabic: language === "ar",
      ready,
      setLanguage,
      t,
    }),
    [language, ready, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
