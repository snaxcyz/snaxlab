import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'xyz.snaxlab.app',
  appName: 'Snaxlab',
  webDir: 'dist',
  server: {
    url: 'https://snaxlab.xyz',
    cleartext: false
  }
};

export default config;
