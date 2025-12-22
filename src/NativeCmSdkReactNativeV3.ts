/**
 * TurboModule specification for cm-sdk-react-native-v3
 *
 * This module defines the native interface for the consent management SDK.
 * All types are defined in this file so codegen can properly parse them.
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// =============================================================================
// TYPE DEFINITIONS
// These must be defined in this file for React Native codegen to parse them.
// =============================================================================

/**
 * Possible consent status values for vendors and purposes.
 */
export type ConsentStatusValue = 'accepted' | 'rejected' | 'unknown';

/**
 * Google Consent Mode v2 consent types.
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export type GoogleConsentType = 'granted' | 'denied';

/**
 * Event payload for consent received events.
 */
export type ConsentReceivedEvent = {
  consent: string;
  jsonObject: { [key: string]: unknown };
};

/**
 * Event payload for error events.
 */
export type ErrorEvent = {
  error: string;
};

/**
 * Event payload for link click events.
 */
export type LinkClickEvent = {
  url: string;
};

/**
 * Event payload for ATT status change events.
 */
export type ATTStatusChangeEvent = {
  oldStatus: number;
  newStatus: number;
  lastUpdated: number;
};

/**
 * URL configuration for the CMP endpoint.
 */
export type UrlConfig = {
  id: string;
  domain: string;
  language: string;
  appName: string;
  noHash?: boolean;
};

/**
 * WebView position options.
 */
export enum WebViewPosition {
  FullScreen = 'fullScreen',
  HalfScreenTop = 'halfScreenTop',
  HalfScreenBottom = 'halfScreenBottom',
  Custom = 'custom',
}

/**
 * Custom rectangle for WebView positioning.
 */
export type WebViewRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Background style types for the consent layer.
 */
export enum BackgroundStyleType {
  Dimmed = 'dimmed',
  Color = 'color',
  Blur = 'blur',
  None = 'none',
}

/**
 * Blur effect styles (iOS only).
 */
export enum BlurEffectStyle {
  Light = 'light',
  Dark = 'dark',
  ExtraLight = 'extraLight',
}

/**
 * App Tracking Transparency status values (iOS).
 * Maps to Apple's ATTrackingManagerAuthorizationStatus.
 */
export enum ATTStatus {
  NotDetermined = 0,
  Restricted = 1,
  Denied = 2,
  Authorized = 3,
}

/**
 * Background style configuration for the consent layer.
 */
export type WebViewBackgroundStyle =
  | {
      type: 'dimmed';
      color?: string | number;
      opacity?: number;
    }
  | { type: 'color'; color: string | number }
  | { type: 'blur'; blurEffectStyle?: string }
  | { type: 'none' };

/**
 * WebView configuration for the consent layer appearance.
 */
export type WebViewConfig = {
  position?: string;
  customRect?: WebViewRect;
  cornerRadius?: number;
  respectsSafeArea?: boolean;
  allowsOrientationChanges?: boolean;
  backgroundStyle?: WebViewBackgroundStyle;
};

/**
 * Comprehensive user consent status information.
 */
export type UserStatus = {
  status: string;
  vendors: { [key: string]: string };
  purposes: { [key: string]: string };
  tcf: string;
  addtlConsent: string;
  regulation: string;
};

/**
 * Google Consent Mode v2 status object.
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export type GoogleConsentModeStatus = {
  ad_storage?: string;
  analytics_storage?: string;
  ad_user_data?: string;
  ad_personalization?: string;
};

/**
 * Helper factory to build strongly-typed background styles.
 */
export const BackgroundStyle = {
  dimmed: (
    color?: string | number,
    opacity?: number
  ): WebViewBackgroundStyle => ({
    type: 'dimmed',
    color,
    opacity,
  }),
  color: (color: string | number): WebViewBackgroundStyle => ({
    type: 'color',
    color,
  }),
  blur: (
    blurEffectStyle: BlurEffectStyle = BlurEffectStyle.Dark
  ): WebViewBackgroundStyle => ({
    type: 'blur',
    blurEffectStyle,
  }),
  none: (): WebViewBackgroundStyle => ({ type: 'none' }),
} as const;

// =============================================================================
// TURBOMODULE SPECIFICATION
// =============================================================================

/**
 * TurboModule specification for the native consent management module.
 * Implements the React Native New Architecture TurboModule protocol.
 */
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
  isConsentRequired(): Promise<boolean>;

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
