import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Event payload types for better TypeScript support
export type ConsentReceivedEvent = {
  consent: string;
  jsonObject: Object;
};

export type ErrorEvent = {
  error: string;
};

export type LinkClickEvent = {
  url: string;
};

export type ATTStatusChangeEvent = {
  oldStatus: number;
  newStatus: number;
  lastUpdated: number;
};

// Additional type definitions for better TypeScript support
export type UrlConfig = {
  id: string;
  domain: string;
  language: string;
  appName: string;
  noHash?: boolean;
};

export enum WebViewPosition {
  FullScreen = 'fullScreen',
  HalfScreenTop = 'halfScreenTop',
  HalfScreenBottom = 'halfScreenBottom',
  Custom = 'custom',
}

export type WebViewRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export enum BackgroundStyleType {
  Dimmed = 'dimmed',
  Color = 'color',
  Blur = 'blur',
  None = 'none',
}

export enum BlurEffectStyle {
  Light = 'light',
  Dark = 'dark',
  ExtraLight = 'extraLight',
}

export enum ATTStatus {
  NotDetermined = 0,
  Restricted = 1,
  Denied = 2,
  Authorized = 3,
}

export type WebViewBackgroundStyle =
  | {
      type: BackgroundStyleType.Dimmed;
      color?: string | number;
      opacity?: number;
    }
  | { type: BackgroundStyleType.Color; color: string | number }
  | { type: BackgroundStyleType.Blur; blurEffectStyle?: BlurEffectStyle }
  | { type: BackgroundStyleType.None };

export type WebViewConfig = {
  position?: WebViewPosition;
  customRect?: WebViewRect;
  cornerRadius?: number;
  respectsSafeArea?: boolean;
  allowsOrientationChanges?: boolean;
  backgroundStyle?: WebViewBackgroundStyle;
};

export type UserStatus = {
  status: string;
  vendors: Object;
  purposes: Object;
  tcf: string;
  addtlConsent: string;
  regulation: string;
};

export type GoogleConsentModeStatus = Object;

export interface Spec extends TurboModule {
  // Configuration methods
  setUrlConfig(config: UrlConfig): Promise<void>;

  setWebViewConfig(config: WebViewConfig): Promise<void>;

  // iOS-only ATT status method
  setATTStatus(status: number): Promise<void>;

  // Main interaction methods
  checkAndOpen(jumpToSettings: boolean): Promise<boolean>;
  forceOpen(jumpToSettings: boolean): Promise<boolean>;

  // Consent status methods
  getUserStatus(): Promise<UserStatus>;

  getStatusForPurpose(purposeId: string): Promise<string>;
  getStatusForVendor(vendorId: string): Promise<string>;
  getGoogleConsentModeStatus(): Promise<GoogleConsentModeStatus>;
  exportCMPInfo(): Promise<string>;
  importCMPInfo(cmpString: string): Promise<boolean>;
  resetConsentManagementData(): Promise<boolean>;

  // Consent modification methods
  acceptVendors(vendors: string[]): Promise<boolean>;
  rejectVendors(vendors: string[]): Promise<boolean>;
  acceptPurposes(purposes: string[], updatePurpose: boolean): Promise<boolean>;
  rejectPurposes(purposes: string[], updateVendor: boolean): Promise<boolean>;
  rejectAll(): Promise<boolean>;
  acceptAll(): Promise<boolean>;

  // Event emitter methods (required for TurboModule)
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CmSdkReactNativeV3');
