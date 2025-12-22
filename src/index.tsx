/**
 * @module cm-sdk-react-native-v3
 * @description Consent Management Platform SDK for React Native (New Architecture)
 *
 * This module provides a comprehensive interface for managing user consent
 * in React Native applications, supporting GDPR, CCPA, and other privacy regulations.
 *
 * @example
 * ```typescript
 * import CmSdkReactNativeV3, {
 *   setUrlConfig,
 *   setWebViewConfig,
 *   addConsentListener,
 *   WebViewPosition,
 *   BackgroundStyle,
 * } from 'cm-sdk-react-native-v3-new-arch';
 *
 * // Configure and initialize
 * await setUrlConfig({ id: 'your-id', domain: '...', language: 'EN', appName: 'App' });
 * await setWebViewConfig({ position: WebViewPosition.HalfScreenBottom });
 *
 * // Listen for consent
 * const sub = addConsentListener((consent, data) => console.log(consent));
 *
 * // Show consent layer
 * await CmSdkReactNativeV3.checkAndOpen(false);
 * ```
 */

import {
  NativeModules,
  Platform,
  NativeEventEmitter,
  processColor,
} from 'react-native';
import type { EmitterSubscription } from 'react-native';
import NativeCmSdkReactNativeV3, {
  type ConsentReceivedEvent,
  type ConsentStatusValue,
  type ErrorEvent,
  type GoogleConsentType,
  type LinkClickEvent,
  type ATTStatusChangeEvent,
  type UrlConfig,
  type WebViewConfig,
  type WebViewRect,
  type WebViewBackgroundStyle,
  WebViewPosition,
  BackgroundStyleType,
  BlurEffectStyle,
  ATTStatus,
  BackgroundStyle,
  type UserStatus,
  type GoogleConsentModeStatus,
} from './NativeCmSdkReactNativeV3';

const LINKING_ERROR =
  `The package 'cm-sdk-react-native-v3-new-arch' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Use TurboModule if available (New Architecture), fallback to legacy NativeModules
const CmSdkReactNativeV3 =
  NativeCmSdkReactNativeV3 ??
  (NativeModules.CmSdkReactNativeV3
    ? NativeModules.CmSdkReactNativeV3
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      ));

/**
 * Indicates whether the TurboModule (New Architecture) is being used.
 * When `true`, the module is loaded via TurboModuleRegistry for optimal performance.
 */
export const isTurboModuleEnabled = NativeCmSdkReactNativeV3 != null;

const eventEmitter = new NativeEventEmitter(CmSdkReactNativeV3);

/**
 * Registers a listener for consent received events.
 * Called when the user makes a consent decision in the consent layer.
 *
 * @param callback - Function called with the consent string and parsed JSON data
 * @returns Subscription that should be removed on cleanup
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   const subscription = addConsentListener((consent, data) => {
 *     console.log('TCF String:', consent);
 *     console.log('Consent data:', data);
 *   });
 *   return () => subscription.remove();
 * }, []);
 * ```
 */
export const addConsentListener = (
  callback: (consent: string, jsonObject: Record<string, unknown>) => void
): EmitterSubscription => {
  return eventEmitter.addListener(
    'didReceiveConsent',
    (event: ConsentReceivedEvent) => {
      callback(event.consent, event.jsonObject);
    }
  );
};

/**
 * Registers a listener for when the consent layer is shown.
 *
 * @param callback - Function called when consent layer becomes visible
 * @returns Subscription that should be removed on cleanup
 */
export const addShowConsentLayerListener = (
  callback: () => void
): EmitterSubscription => {
  return eventEmitter.addListener('didShowConsentLayer', callback);
};

/**
 * Registers a listener for when the consent layer is closed.
 *
 * @param callback - Function called when consent layer is dismissed
 * @returns Subscription that should be removed on cleanup
 */
export const addCloseConsentLayerListener = (
  callback: () => void
): EmitterSubscription => {
  return eventEmitter.addListener('didCloseConsentLayer', callback);
};

/**
 * Registers a listener for error events from the CMP.
 *
 * @param callback - Function called with error message when an error occurs
 * @returns Subscription that should be removed on cleanup
 */
export const addErrorListener = (
  callback: (error: string) => void
): EmitterSubscription => {
  return eventEmitter.addListener('didReceiveError', (event: ErrorEvent) => {
    callback(event.error);
  });
};

/**
 * Registers a listener for link click events in the consent layer.
 * Use this to handle external links (e.g., privacy policy) custom behavior.
 *
 * @param callback - Function called with the clicked URL
 * @returns Subscription that should be removed on cleanup
 */
export const addClickLinkListener = (
  callback: (url: string) => void
): EmitterSubscription => {
  return eventEmitter.addListener('onClickLink', (event: LinkClickEvent) => {
    callback(event.url);
  });
};

/**
 * Registers a listener for ATT (App Tracking Transparency) status changes.
 * iOS only - will not fire on Android.
 *
 * @param callback - Function called with old/new status and timestamp
 * @returns Subscription that should be removed on cleanup
 */
export const addATTStatusChangeListener = (
  callback: (event: ATTStatusChangeEvent) => void
): EmitterSubscription => {
  return eventEmitter.addListener('didChangeATTStatus', callback);
};

/**
 * Configures the CMP URL endpoint.
 * Must be called before any other CMP operations.
 *
 * @param config - URL configuration object
 * @returns Promise that resolves when configuration is complete
 *
 * @example
 * ```typescript
 * await setUrlConfig({
 *   id: 'your-cmp-id',
 *   domain: 'delivery.consentmanager.net',
 *   language: 'EN',
 *   appName: 'MyApp',
 *   noHash: true,
 * });
 * ```
 */
export const setUrlConfig = (config: UrlConfig): Promise<void> => {
  return CmSdkReactNativeV3.setUrlConfig(config);
};

/**
 * Configures the consent layer WebView appearance.
 * Call this before opening the consent layer to customize its look.
 *
 * @param config - WebView configuration object
 * @returns Promise that resolves when configuration is complete
 *
 * @example
 * ```typescript
 * await setWebViewConfig({
 *   position: WebViewPosition.HalfScreenBottom,
 *   backgroundStyle: BackgroundStyle.blur(BlurEffectStyle.Dark),
 *   cornerRadius: 20,
 *   respectsSafeArea: true,
 * });
 * ```
 */
export const setWebViewConfig = (config: WebViewConfig): Promise<void> => {
  const normalized = normalizeWebViewConfig(config);
  return CmSdkReactNativeV3.setWebViewConfig(normalized);
};

/**
 * Sets the App Tracking Transparency (ATT) status for iOS.
 * Call this after requesting ATT permission from the user.
 * Has no effect on Android.
 *
 * @param status - ATT authorization status (0-3)
 * @throws Error if status is not a valid ATTStatus value
 * @returns Promise that resolves when status is set
 *
 * @example
 * ```typescript
 * import { ATTStatus } from 'cm-sdk-react-native-v3-new-arch';
 *
 * // After ATT request
 * await setATTStatus(ATTStatus.Authorized);
 * ```
 */
export const setATTStatus = (status: ATTStatus | number): Promise<void> => {
  const allowed = new Set<ATTStatus>([
    ATTStatus.NotDetermined,
    ATTStatus.Restricted,
    ATTStatus.Denied,
    ATTStatus.Authorized,
  ]);
  if (!allowed.has(status as ATTStatus)) {
    throw new Error(
      `[cm-sdk-react-native-v3] Invalid ATT status ${status}. Use ATTStatus enum (0–3 from Apple's ATTrackingManagerAuthorizationStatus).`
    );
  }
  return CmSdkReactNativeV3.setATTStatus(status);
};

/**
 * Checks if consent is required and opens the consent layer if needed.
 *
 * @param jumpToSettings - If true, opens directly to settings/preferences page
 * @returns Promise resolving to true if consent layer was shown
 *
 * @example
 * ```typescript
 * // Show consent layer only if needed
 * const wasShown = await checkAndOpen(false);
 *
 * // Jump directly to settings
 * await checkAndOpen(true);
 * ```
 */
export const checkAndOpen = (jumpToSettings: boolean): Promise<boolean> => {
  return CmSdkReactNativeV3.checkAndOpen(jumpToSettings);
};

/**
 * Forces the consent layer to open regardless of current consent state.
 *
 * @param jumpToSettings - If true, opens directly to settings/preferences page
 * @returns Promise resolving to true when consent layer is shown
 */
export const forceOpen = (jumpToSettings: boolean): Promise<boolean> => {
  return CmSdkReactNativeV3.forceOpen(jumpToSettings);
};

/**
 * Gets the current user consent status including all vendors and purposes.
 *
 * @returns Promise resolving to complete user consent status
 *
 * @example
 * ```typescript
 * const status = await getUserStatus();
 * console.log('TCF String:', status.tcf);
 * console.log('Vendors:', status.vendors);
 * console.log('Purposes:', status.purposes);
 * ```
 */
export const getUserStatus = (): Promise<UserStatus> => {
  return CmSdkReactNativeV3.getUserStatus();
};

/**
 * Checks if consent is required from the user.
 * Does not open the consent layer.
 *
 * @returns Promise resolving to true if consent is needed
 */
export const isConsentRequired = (): Promise<boolean> => {
  return CmSdkReactNativeV3.isConsentRequired();
};

// Internal helper functions
const normalizeWebViewConfig = (config: WebViewConfig): WebViewConfig => {
  const position =
    (config.position as WebViewPosition | undefined) ??
    WebViewPosition.FullScreen;
  const allowedPositions = [
    WebViewPosition.FullScreen,
    WebViewPosition.HalfScreenTop,
    WebViewPosition.HalfScreenBottom,
    WebViewPosition.Custom,
  ];
  if (!allowedPositions.includes(position)) {
    throw new Error(`Invalid WebView position: ${position}`);
  }

  if (position === WebViewPosition.Custom) {
    if (!config.customRect) {
      throw new Error('customRect is required when position is "custom"');
    }
    if (Platform.OS === 'android') {
      console.warn(
        '[cm-sdk-react-native-v3] Android SDK ignores customRect; falling back to full screen.'
      );
    }
  }

  const backgroundStyle = (() => {
    if (!config.backgroundStyle) {
      return {
        type: BackgroundStyleType.Dimmed,
        color: normalizeColor('black'),
        opacity: 0.5,
      } as WebViewBackgroundStyle;
    }
    const { type } = config.backgroundStyle;
    switch (type) {
      case BackgroundStyleType.Dimmed:
        return {
          type,
          color: normalizeColor(config.backgroundStyle.color ?? 'black'),
          opacity: config.backgroundStyle.opacity ?? 0.5,
        } as WebViewBackgroundStyle;
      case BackgroundStyleType.Color:
        if (!config.backgroundStyle.color)
          throw new Error('color is required for backgroundStyle "color"');
        return {
          type,
          color: normalizeColor(config.backgroundStyle.color),
        } as WebViewBackgroundStyle;
      case BackgroundStyleType.Blur: {
        const blurStyle =
          config.backgroundStyle.blurEffectStyle ?? BlurEffectStyle.Dark;
        if (
          blurStyle !== BlurEffectStyle.Dark &&
          blurStyle !== BlurEffectStyle.Light &&
          blurStyle !== BlurEffectStyle.ExtraLight
        ) {
          throw new Error(`Invalid blurEffectStyle: ${blurStyle}`);
        }
        if (Platform.OS === 'android') {
          console.warn(
            '[cm-sdk-react-native-v3] Android SDK ignores blur; using dimmed.'
          );
        }
        return { type, blurEffectStyle: blurStyle } as WebViewBackgroundStyle;
      }
      case BackgroundStyleType.None:
        return { type } as WebViewBackgroundStyle;
      default:
        throw new Error(
          `Invalid backgroundStyle type: ${(config.backgroundStyle as WebViewBackgroundStyle).type}`
        );
    }
  })();

  if (Platform.OS === 'android' && config.backgroundStyle) {
    console.warn(
      '[cm-sdk-react-native-v3] Android SDK ignores backgroundStyle; using dimmed.'
    );
  }

  return {
    position,
    customRect: config.customRect,
    cornerRadius: config.cornerRadius ?? 5,
    respectsSafeArea: config.respectsSafeArea ?? true,
    allowsOrientationChanges: config.allowsOrientationChanges ?? true,
    backgroundStyle,
  };
};

const normalizeColor = (color: string | number | undefined) => {
  if (color === undefined) return undefined;
  const processed = processColor(color);
  if (processed == null) throw new Error(`Invalid color value: ${color}`);
  return processed;
};

/**
 * Gets the consent status for a specific purpose.
 *
 * @param purposeId - The purpose ID (e.g., 'c52', 'c53')
 * @returns Promise resolving to the consent status string
 */
export const getStatusForPurpose = (purposeId: string): Promise<string> => {
  return CmSdkReactNativeV3.getStatusForPurpose(purposeId);
};

/**
 * Gets the consent status for a specific vendor.
 *
 * @param vendorId - The vendor ID (e.g., 's2789')
 * @returns Promise resolving to the consent status string
 */
export const getStatusForVendor = (vendorId: string): Promise<string> => {
  return CmSdkReactNativeV3.getStatusForVendor(vendorId);
};

/**
 * Gets the Google Consent Mode v2 status.
 * Useful for Firebase Analytics and Google Ads integration.
 *
 * @returns Promise resolving to Google Consent Mode status object
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export const getGoogleConsentModeStatus =
  (): Promise<GoogleConsentModeStatus> => {
    return CmSdkReactNativeV3.getGoogleConsentModeStatus();
  };

/**
 * Exports the current CMP information as a portable string.
 * Can be imported later using `importCMPInfo`.
 *
 * @returns Promise resolving to the exported CMP string
 */
export const exportCMPInfo = (): Promise<string> => {
  return CmSdkReactNativeV3.exportCMPInfo();
};

/**
 * Imports previously exported CMP information.
 *
 * @param cmpString - The CMP string from `exportCMPInfo`
 * @returns Promise resolving to true if import was successful
 */
export const importCMPInfo = (cmpString: string): Promise<boolean> => {
  return CmSdkReactNativeV3.importCMPInfo(cmpString);
};

/**
 * Resets all consent management data.
 * User will need to provide consent again.
 *
 * @returns Promise resolving to true if reset was successful
 */
export const resetConsentManagementData = (): Promise<boolean> => {
  return CmSdkReactNativeV3.resetConsentManagementData();
};

/**
 * Accepts consent for specific vendors.
 *
 * @param vendors - Array of vendor IDs to accept
 * @returns Promise resolving to true if successful
 */
export const acceptVendors = (vendors: string[]): Promise<boolean> => {
  return CmSdkReactNativeV3.acceptVendors(vendors);
};

/**
 * Rejects consent for specific vendors.
 *
 * @param vendors - Array of vendor IDs to reject
 * @returns Promise resolving to true if successful
 */
export const rejectVendors = (vendors: string[]): Promise<boolean> => {
  return CmSdkReactNativeV3.rejectVendors(vendors);
};

/**
 * Accepts consent for specific purposes.
 *
 * @param purposes - Array of purpose IDs to accept
 * @param updatePurpose - Whether to update related purposes
 * @returns Promise resolving to true if successful
 */
export const acceptPurposes = (
  purposes: string[],
  updatePurpose: boolean
): Promise<boolean> => {
  return CmSdkReactNativeV3.acceptPurposes(purposes, updatePurpose);
};

/**
 * Rejects consent for specific purposes.
 *
 * @param purposes - Array of purpose IDs to reject
 * @param updateVendor - Whether to update related vendors
 * @returns Promise resolving to true if successful
 */
export const rejectPurposes = (
  purposes: string[],
  updateVendor: boolean
): Promise<boolean> => {
  return CmSdkReactNativeV3.rejectPurposes(purposes, updateVendor);
};

/**
 * Rejects all consent options.
 *
 * @returns Promise resolving to true if successful
 */
export const rejectAll = (): Promise<boolean> => {
  return CmSdkReactNativeV3.rejectAll();
};

/**
 * Accepts all consent options.
 *
 * @returns Promise resolving to true if successful
 */
export const acceptAll = (): Promise<boolean> => {
  return CmSdkReactNativeV3.acceptAll();
};

/**
 * Checks if the React Native New Architecture is enabled.
 * Useful for debugging and conditional behavior.
 *
 * @returns true if New Architecture (TurboModules/Fabric) is enabled
 */
export const isNewArchitectureEnabled = (): boolean => {
  // Check multiple indicators for New Architecture
  if (NativeCmSdkReactNativeV3 != null) {
    return true;
  }

  // Check for bridgeless mode (official RN flag)
  if ((global as Record<string, unknown>).RN$Bridgeless === true) {
    return true;
  }

  // Check for TurboModule interop flag
  if ((global as Record<string, unknown>).RN$TurboInterop === true) {
    return true;
  }

  return false;
};

// Re-export types for consumer convenience
export type {
  ConsentReceivedEvent,
  ConsentStatusValue,
  ErrorEvent,
  GoogleConsentType,
  LinkClickEvent,
  ATTStatusChangeEvent,
  UrlConfig,
  WebViewRect,
  WebViewBackgroundStyle,
  WebViewConfig,
  UserStatus,
  GoogleConsentModeStatus,
};

// Re-export enums/constants for consumers
export {
  WebViewPosition,
  BackgroundStyleType,
  BlurEffectStyle,
  ATTStatus,
  BackgroundStyle,
};

export default CmSdkReactNativeV3;
