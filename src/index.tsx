import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import NativeCmSdkReactNativeV3, {
  type ConsentReceivedEvent,
  type ErrorEvent,
  type LinkClickEvent,
  type ATTStatusChangeEvent,
  type UrlConfig,
  type WebViewConfig,
  type UserStatus,
  type GoogleConsentModeStatus,
} from './NativeCmSdkReactNativeV3';

const LINKING_ERROR =
  `The package 'react-native-cm-sdk-react-native-v3' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Use TurboModule if available (New Architecture), fallback to legacy NativeModules
const CmSdkReactNativeV3 = NativeCmSdkReactNativeV3 ?? (NativeModules.CmSdkReactNativeV3
  ? NativeModules.CmSdkReactNativeV3
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    ));

export const isTurboModuleEnabled = NativeCmSdkReactNativeV3 != null;

const eventEmitter = new NativeEventEmitter(CmSdkReactNativeV3);

export const addConsentListener = (
  callback: (consent: string, jsonObject: Object) => void
) => {
  return eventEmitter.addListener('didReceiveConsent', (event: ConsentReceivedEvent) => {
    callback(event.consent, event.jsonObject);
  });
};

export const addShowConsentLayerListener = (callback: () => void) => {
  return eventEmitter.addListener('didShowConsentLayer', callback);
};

export const addCloseConsentLayerListener = (callback: () => void) => {
  return eventEmitter.addListener('didCloseConsentLayer', callback);
};

export const addErrorListener = (callback: (error: string) => void) => {
  return eventEmitter.addListener('didReceiveError', (event: ErrorEvent) => {
    callback(event.error);
  });
};

export const addClickLinkListener = (callback: (url: string) => void) => {
  return eventEmitter.addListener('onClickLink', (event: LinkClickEvent) => {
    callback(event.url);
  });
};

export const addATTStatusChangeListener = (callback: (event: ATTStatusChangeEvent) => void) => {
  return eventEmitter.addListener('didChangeATTStatus', callback);
};

// Core configuration methods
export const setUrlConfig = (config: UrlConfig): Promise<void> => {
  return CmSdkReactNativeV3.setUrlConfig(config);
};

export const setWebViewConfig = (config: WebViewConfig): Promise<void> => {
  return CmSdkReactNativeV3.setWebViewConfig(config);
};

export const setATTStatus = (status: number): Promise<void> => {
  return CmSdkReactNativeV3.setATTStatus(status);
};

// Main interaction methods
export const checkAndOpen = (jumpToSettings: boolean): Promise<boolean> => {
  return CmSdkReactNativeV3.checkAndOpen(jumpToSettings);
};

export const forceOpen = (jumpToSettings: boolean): Promise<boolean> => {
  return CmSdkReactNativeV3.forceOpen(jumpToSettings);
};

// Consent status methods
export const getUserStatus = (): Promise<UserStatus> => {
  return CmSdkReactNativeV3.getUserStatus();
};

export const getStatusForPurpose = (purposeId: string): Promise<string> => {
  return CmSdkReactNativeV3.getStatusForPurpose(purposeId);
};

export const getStatusForVendor = (vendorId: string): Promise<string> => {
  return CmSdkReactNativeV3.getStatusForVendor(vendorId);
};

export const getGoogleConsentModeStatus = (): Promise<GoogleConsentModeStatus> => {
  return CmSdkReactNativeV3.getGoogleConsentModeStatus();
};

export const exportCMPInfo = (): Promise<string> => {
  return CmSdkReactNativeV3.exportCMPInfo();
};

export const importCMPInfo = (cmpString: string): Promise<boolean> => {
  return CmSdkReactNativeV3.importCMPInfo(cmpString);
};

export const resetConsentManagementData = (): Promise<boolean> => {
  return CmSdkReactNativeV3.resetConsentManagementData();
};

// Consent modification methods
export const acceptVendors = (vendors: string[]): Promise<boolean> => {
  return CmSdkReactNativeV3.acceptVendors(vendors);
};

export const rejectVendors = (vendors: string[]): Promise<boolean> => {
  return CmSdkReactNativeV3.rejectVendors(vendors);
};

export const acceptPurposes = (purposes: string[], updatePurpose: boolean): Promise<boolean> => {
  return CmSdkReactNativeV3.acceptPurposes(purposes, updatePurpose);
};

export const rejectPurposes = (purposes: string[], updateVendor: boolean): Promise<boolean> => {
  return CmSdkReactNativeV3.rejectPurposes(purposes, updateVendor);
};

export const rejectAll = (): Promise<boolean> => {
  return CmSdkReactNativeV3.rejectAll();
};

export const acceptAll = (): Promise<boolean> => {
  return CmSdkReactNativeV3.acceptAll();
};

// Helper function to check if New Architecture is enabled
export const isNewArchitectureEnabled = (): boolean => {
  // Check multiple indicators for New Architecture
  // 1. Check if our module was loaded via TurboModuleRegistry
  if (NativeCmSdkReactNativeV3 != null) {
    return true;
  }

  // 2. Check for bridgeless mode (official RN flag)
  if ((global as any).RN$Bridgeless === true) {
    return true;
  }

  // 3. Check for TurboModule interop flag
  if ((global as any).RN$TurboInterop === true) {
    return true;
  }

  return false;
};

// Re-export types for consumer convenience
export type {
  ConsentReceivedEvent,
  ErrorEvent,
  LinkClickEvent,
  ATTStatusChangeEvent,
  UrlConfig,
  WebViewConfig,
  UserStatus,
  GoogleConsentModeStatus,
};

export default CmSdkReactNativeV3;
