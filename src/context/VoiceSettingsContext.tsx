import React, {createContext, useContext, useMemo, useState} from 'react';

type Ctx = {
  fromLang: string;                // e.g. 'en'
  toLang: string;                  // e.g. 'fr'
  setFromLang: (code: string) => void;
  setToLang: (code: string) => void;
  swap: () => void;
};

const VoiceSettingsContext = createContext<Ctx | null>(null);

export const VoiceSettingsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  // keep ONLY string language codes in state
  const [fromLang, setFromLang] = useState<string>('en');
  const [toLang, setToLang] = useState<string>('fr');

  const swap = () => {
    setFromLang(prev => {
      const oldFrom = prev;
      setToLang(oldFrom2 => fromLang); // set to previous fromLang
      return toLang;                    // set fromLang to previous toLang
    });
  };

  const value = useMemo(
    () => ({fromLang, toLang, setFromLang, setToLang, swap}),
    [fromLang, toLang]
  );

  return <VoiceSettingsContext.Provider value={value}>{children}</VoiceSettingsContext.Provider>;
};

export const useVoiceSettings = () => {
  const ctx = useContext(VoiceSettingsContext);
  if (!ctx) throw new Error('useVoiceSettings must be used within VoiceSettingsProvider');
  return ctx;
};