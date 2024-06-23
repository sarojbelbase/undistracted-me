import { useState, useEffect } from 'react';
import { LANGUAGES } from '../constants/settings';

const useLanguage = () => {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage ? savedLanguage : LANGUAGES.en;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return [language, setLanguage];
};

export default useLanguage;
