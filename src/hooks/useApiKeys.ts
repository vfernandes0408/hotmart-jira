import { useState, useEffect } from 'react';

const IA_KEYS_KEY = 'iaKeys';

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const savedKeys = localStorage.getItem(IA_KEYS_KEY);
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }
  }, []);

  const saveKey = (key: string, value: string) => {
    const newKeys = { ...apiKeys, [key]: value };
    localStorage.setItem(IA_KEYS_KEY, JSON.stringify(newKeys));
    setApiKeys(newKeys);
  };

  const removeKey = (key: string) => {
    const newKeys = { ...apiKeys };
    delete newKeys[key];
    localStorage.setItem(IA_KEYS_KEY, JSON.stringify(newKeys));
    setApiKeys(newKeys);
  };

  const isConfigured = (key: string) => {
    return !!apiKeys[key];
  };

  return { apiKeys, saveKey, removeKey, isConfigured };
};
