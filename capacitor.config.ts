import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ruma.watersolutions',
  appName: 'Ruma Water Solutions',
  webDir: 'dist',
  server: {
    hostname: 'ruma-water.app',
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '449552278886-2k7dgm73hr8svsprlhb2sm6iuuq04htj.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
