/// <reference types="vite/client" />

import { AuraAPI } from '../electron/preload';

declare global {
  interface Window {
    auraOS?: AuraAPI;
  }
}
