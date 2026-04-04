// Remote configuration context
import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchAndActivate, getString, getBoolean } from 'firebase/remote-config';
import { remoteConfig, safeError } from '../firebase';

import { APP_VERSION, APP_BUILD_NUMBER } from '../constants';

interface RemoteConfigValues {
  appName: string;
  promoBannerText: string;
  showPromoBanner: boolean;
  contactPhone: string;
  latestVersion: string;
  appVersion: string;
  latestVersionCode: number;
  updateUrl: string;
  isLoading: boolean;
}

const RemoteConfigContext = createContext<RemoteConfigValues | undefined>(undefined);

export const RemoteConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<RemoteConfigValues>({
    appName: 'Ruma Water Solutions',
    promoBannerText: '',
    showPromoBanner: false,
    contactPhone: '+880123456789',
    latestVersion: APP_VERSION,
    appVersion: APP_VERSION,
    latestVersionCode: APP_BUILD_NUMBER,
    updateUrl: '',
    isLoading: true,
  });

  useEffect(() => {
    const setupRemoteConfig = async () => {
      try {
        // Set fetch interval to 0 to force fetch on every start for testing
        remoteConfig.settings.minimumFetchIntervalMillis = 0;
        
        remoteConfig.defaultConfig = {
          'app_name': 'Ruma Water Solutions',
          'promo_banner_text': '',
          'show_promo_banner': false,
          'contact_phone': '+880123456789',
          'latest_version': APP_VERSION,
          'app_version': APP_VERSION,
          'latest_version_code': APP_BUILD_NUMBER,
          'update_url': '',
        };

        // Fetch and activate
        await fetchAndActivate(remoteConfig);

        // Update state with values from Remote Config
        const fetchedAppVersion = getString(remoteConfig, 'app_version');
        const fetchedLatestVersion = getString(remoteConfig, 'latest_version');
        const fetchedLatestVersionCode = Number(getString(remoteConfig, 'latest_version_code'));
        const fetchedUpdateUrl = getString(remoteConfig, 'update_url').trim();

        console.log('[RemoteConfig] Fetched values:', {
          app_version: fetchedAppVersion,
          latest_version: fetchedLatestVersion,
          latest_version_code: fetchedLatestVersionCode,
          update_url: fetchedUpdateUrl
        });

        setConfig({
          appName: getString(remoteConfig, 'app_name'),
          promoBannerText: getString(remoteConfig, 'promo_banner_text'),
          showPromoBanner: getBoolean(remoteConfig, 'show_promo_banner'),
          contactPhone: getString(remoteConfig, 'contact_phone'),
          latestVersion: fetchedLatestVersion !== '1.0.0' ? fetchedLatestVersion : fetchedAppVersion,
          appVersion: fetchedAppVersion,
          latestVersionCode: fetchedLatestVersionCode,
          updateUrl: fetchedUpdateUrl,
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
