import React, { createContext, useContext, useEffect, useState } from 'react';

interface PrivacyContextType {
  privacy: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({ privacy: false, togglePrivacy: () => {} });

/**
 * Privacy mode blurs every money figure (elements with the .tnum class)
 * so the app can be used on a train or in a meeting without broadcasting
 * your net worth. State is a body class so no component needs re-rendering.
 */
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [privacy, setPrivacy] = useState<boolean>(() => localStorage.getItem('wf_privacy') === '1');

  useEffect(() => {
    document.body.classList.toggle('privacy', privacy);
    localStorage.setItem('wf_privacy', privacy ? '1' : '0');
  }, [privacy]);

  const togglePrivacy = () => setPrivacy(p => !p);

  return <PrivacyContext.Provider value={{ privacy, togglePrivacy }}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
