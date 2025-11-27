import {
  NativeModules,
  Platform,
  NativeEventEmitter,
  processColor,
} from 'react-native';
import NativeCmSdkReactNativeV3, {
  type ConsentReceivedEvent,
  type ErrorEvent,
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
  type UserStatus,
  type GoogleConsentModeStatus,
} from './NativeCmSdkReactNativeV3';

const LINKING_ERROR =
  `The package 'react-native-cm-sdk-react-native-v3' doesn't seem to be linked. Make sure: \n\n` +
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

export const isTurboModuleEnabled = NativeCmSdkReactNativeV3 != null;

const eventEmitter = new NativeEventEmitter(CmSdkReactNativeV3);

export const addConsentListener = (
  callback: (consent: string, jsonObject: Object) => void
) => {
  return eventEmitter.addListener(
    'didReceiveConsent',
    (event: ConsentReceivedEvent) => {
      callback(event.consent, event.jsonObject);
    }
  );
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

export const addATTStatusChangeListener = (
  callback: (event: ATTStatusChangeEvent) => void
) => {
  return eventEmitter.addListener('didChangeATTStatus', callback);
};

// Core configuration methods
export const setUrlConfig = (config: UrlConfig): Promise<void> => {
  return CmSdkReactNativeV3.setUrlConfig(config);
};

export const setWebViewConfig = (config: WebViewConfig): Promise<void> => {
  const normalized = normalizeWebViewConfig(config);
  return CmSdkReactNativeV3.setWebViewConfig(normalized);
};

export const setATTStatus = (status: ATTStatus | number): Promise<void> => {
  const allowed = new Set<ATTStatus>([
    ATTStatus.NotDetermined,
    ATTStatus.Restricted,
    ATTStatus.Denied,
    ATTStatus.Authorized,
  ]);
  if (!allowed.has(status as ATTStatus)) {
    throw new Error(
      `[cm-sdk-react-native-v3-newarch] Invalid ATT status ${status}. Use ATTStatus enum (0–3 from Apple's ATTrackingManagerAuthorizationStatus).`
    );
  }
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

// Helpers
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
        '[cm-sdk-react-native-v3-newarch] Android native SDK currently ignores customRect/position "custom"; it will fall back to full screen.'
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
          config.backgroundStyle.blurEffectStyle ??
          (Platform.OS === 'ios' ? BlurEffectStyle.Dark : BlurEffectStyle.Dark);
        if (
          blurStyle !== BlurEffectStyle.Dark &&
          blurStyle !== BlurEffectStyle.Light &&
          blurStyle !== BlurEffectStyle.ExtraLight
        ) {
          throw new Error(`Invalid blurEffectStyle: ${blurStyle}`);
        }
        if (Platform.OS === 'android') {
          console.warn(
            '[cm-sdk-react-native-v3-newarch] Android native SDK currently ignores blur backgrounds; using dimmed.'
          );
        }
        return { type, blurEffectStyle: blurStyle } as WebViewBackgroundStyle;
      }
      case BackgroundStyleType.None:
        return { type } as WebViewBackgroundStyle;
      default:
        throw new Error(
          `Invalid backgroundStyle type: ${(config.backgroundStyle as any).type}`
        );
    }
  })();

  if (Platform.OS === 'android' && config.backgroundStyle) {
    console.warn(
      '[cm-sdk-react-native-v3-newarch] Android native SDK currently ignores backgroundStyle overrides; it always uses a dimmed background.'
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

export const getStatusForPurpose = (purposeId: string): Promise<string> => {
  return CmSdkReactNativeV3.getStatusForPurpose(purposeId);
};

export const getStatusForVendor = (vendorId: string): Promise<string> => {
  return CmSdkReactNativeV3.getStatusForVendor(vendorId);
};

export const getGoogleConsentModeStatus =
  (): Promise<GoogleConsentModeStatus> => {
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

export const acceptPurposes = (
  purposes: string[],
  updatePurpose: boolean
): Promise<boolean> => {
  return CmSdkReactNativeV3.acceptPurposes(purposes, updatePurpose);
};

export const rejectPurposes = (
  purposes: string[],
  updateVendor: boolean
): Promise<boolean> => {
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
  WebViewRect,
  WebViewBackgroundStyle,
  WebViewConfig,
  UserStatus,
  GoogleConsentModeStatus,
};

// Re-export enums/constants for consumers
export { WebViewPosition, BackgroundStyleType, BlurEffectStyle, ATTStatus };

/**
 * Helper factory to build strongly-typed background styles.
 */
export const BackgroundStyle = {
  dimmed: (
    color?: string | number,
    opacity?: number
  ): WebViewBackgroundStyle => ({
    type: BackgroundStyleType.Dimmed,
    color,
    opacity,
  }),
  color: (color: string | number): WebViewBackgroundStyle => ({
    type: BackgroundStyleType.Color,
    color,
  }),
  blur: (
    blurEffectStyle: BlurEffectStyle = BlurEffectStyle.Dark
  ): WebViewBackgroundStyle => ({
    type: BackgroundStyleType.Blur,
    blurEffectStyle,
  }),
  none: (): WebViewBackgroundStyle => ({ type: BackgroundStyleType.None }),
} as const;

export default CmSdkReactNativeV3;
