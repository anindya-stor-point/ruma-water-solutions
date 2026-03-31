import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchAndActivate, getString, getBoolean } from 'firebase/remote-config';
import { remoteConfig, safeError } from '../firebase';

interface RemoteConfigValues {
  appName: string;
  promoBannerText: string;
  showPromoBanner: boolean;
  contactPhone: string;
  isLoading: boolean;
}

const RemoteConfigContext = createContext<RemoteConfigValues | undefined>(undefined);

export const RemoteConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<RemoteConfigValues>({
    appName: 'Ruma Water Solutions',
    promoBannerText: '',
    showPromoBanner: false,
    contactPhone: '+880123456789',
    isLoading: true,
  });

  useEffect(() => {
    const setupRemoteConfig = async () => {
      try {
        // Set fetch interval (0 for development, 1 hour for production)
        remoteConfig.settings.minimumFetchIntervalMillis = 
          process.env.NODE_ENV === 'production' ? 3600000 : 0;
        
        remoteConfig.defaultConfig = {
          'app_name': 'Ruma Water Solutions',
          'promo_banner_text': '',
          'show_promo_banner': false,
          'contact_phone': '+880123456789',
        };

        // Fetch and activate
        await fetchAndActivate(remoteConfig);

        // Update state with values from Remote Config
        setConfig({
          appName: getString(remoteConfig, 'app_name'),
          promoBannerText: getString(remoteConfig, 'promo_banner_text'),
          showPromoBanner: getBoolean(remoteConfig, 'show_promo_banner'),
          contactPhone: getString(remoteConfig, 'contact_phone'),
          isLoading: false,
        });
      } catch (error) {
        safeError('Failed to fetch remote config:', error);
        setConfig(prev => ({ ...prev, isLoading: false }));
      }
    };

    setupRemoteConfig();
  }, []);

  return (
    <RemoteConfigContext.Provider value={config}>
      {children}
    </RemoteConfigContext.Provider>
  );
};

export const useRemoteConfig = () => {
  const context = useContext(RemoteConfigContext);
  if (context === undefined) {
    throw new Error('useRemoteConfig must be used within a RemoteConfigProvider');
  }
  return context;
};
