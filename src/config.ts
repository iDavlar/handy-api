import { HandyConfig, RecursivePartial } from './types';

const API_PRODUCTION = 'https://www.handyfeeling.com/api/handy/v2';
const SCRIPT_API_PRODUCTION =
  'https://scripts01.handyfeeling.com/api/script/v0';
const UUI_PRODUCTION = 'https://universalui.handyfeeling.com';

export const defaultConfig: HandyConfig = {
  API: API_PRODUCTION,
  scriptAPI: SCRIPT_API_PRODUCTION,
  UUI: {
    URL: UUI_PRODUCTION,
    theme: 'default',
    storeURL: 'https://thehandy.com/',
    errorAlign: 'left',
  },
  syncClientServerTime: true,
  syncClient: { syncCount: 30, outliers: 10 },
  syncHandy: { syncCount: 30, outliers: 10 },
  videoPlayerDelayForSecondPlay: 2500,
  timeBetweenSyncs: 60 * 60 * 1000,
  throttleDelay: 200,
  localStorage: typeof localStorage !== 'undefined' ? localStorage : void 0,
};

export function updateConfig(
  config: HandyConfig,
  change: RecursivePartial<HandyConfig>,
): HandyConfig {
  const {
    syncClient: syncClientConfig,
    syncHandy: syncHandyConfig,
    UUI: UUIConfig,
    localStorage: LSConfig,
    ...restConfig
  } = config;
  const {
    syncClient: syncClientChange,
    syncHandy: syncHandyChange,
    UUI: UUIChange,
    localStorage: LSChange,
    ...restChange
  } = change;

  return {
    ...restConfig,
    ...restChange,
    syncClient: { ...syncClientConfig, ...syncClientChange },
    syncHandy: { ...syncHandyConfig, ...syncHandyChange },
    UUI: { ...UUIConfig, ...UUIChange },
    localStorage: LSChange ? { ...LSConfig, ...LSChange } : LSConfig,
  };
}
