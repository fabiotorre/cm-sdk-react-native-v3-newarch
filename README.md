# consentmanager SDK for React Native (New Architecture)

[![npm version](https://badge.fury.io/js/cm-sdk-react-native-v3-new-arch.svg)](https://www.npmjs.com/package/cm-sdk-react-native-v3-new-arch)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Consent Management Platform (CMP) SDK bridge for React Native with **New Architecture (TurboModules) support**.

## Features

- Full TurboModule implementation with proper protocol conformance
- Complete TypeScript support with comprehensive type definitions
- Google Consent Mode v2 compatible
- Customizable consent layer UI (position, background styles, blur effects)
- Event-driven architecture for consent state changes
- iOS ATT (App Tracking Transparency) integration

## Requirements

| Platform | Minimum Version |
|----------|----------------|
| React Native | 0.74+ |
| iOS | 13.4+ |
| Android | SDK 24+ (Android 7.0) |

> **Note**: This package requires New Architecture enabled (`RCT_NEW_ARCH_ENABLED=1`). For legacy architecture support, use version 3.x.

## Installation

```bash
# Using npm
npm install cm-sdk-react-native-v3-new-arch

# Using yarn
yarn add cm-sdk-react-native-v3-new-arch
```

### iOS Setup

```bash
cd ios && pod install
```

### Android Setup

No additional setup required. The library uses auto-linking.

## Quick Start

```typescript
import CmSdkReactNativeV3, {
  addConsentListener,
  addErrorListener,
  setUrlConfig,
  setWebViewConfig,
  WebViewPosition,
  BackgroundStyle,
  ATTStatus,
} from 'cm-sdk-react-native-v3-new-arch';

// 1. Configure the CMP
await setUrlConfig({
  id: 'your-cmp-id',
  domain: 'delivery.consentmanager.net',
  language: 'EN',
  appName: 'YourAppName',
});

// 2. Customize the consent layer UI
await setWebViewConfig({
  position: WebViewPosition.HalfScreenBottom,
  backgroundStyle: BackgroundStyle.blur(),
  cornerRadius: 20,
  respectsSafeArea: true,
});

// 3. Set up event listeners
const consentSubscription = addConsentListener((consent, data) => {
  console.log('Consent received:', consent);
});

// 4. Check and open consent layer if needed
await CmSdkReactNativeV3.checkAndOpen(false);

// Clean up on unmount
consentSubscription.remove();
```

## API Reference

### Configuration

#### `setUrlConfig(config: UrlConfig): Promise<void>`

Configures the CMP endpoint.

```typescript
type UrlConfig = {
  id: string;        // Your CMP ID
  domain: string;    // CMP delivery domain
  language: string;  // ISO 639-1 language code
  appName: string;   // Your application name
  noHash?: boolean;  // Disable URL hashing
};
```

#### `setWebViewConfig(config: WebViewConfig): Promise<void>`

Customizes the consent layer appearance.

```typescript
type WebViewConfig = {
  position?: WebViewPosition;
  customRect?: WebViewRect;
  cornerRadius?: number;
  respectsSafeArea?: boolean;
  allowsOrientationChanges?: boolean;
  backgroundStyle?: WebViewBackgroundStyle;
};
```

### Positions

| Position | Description |
|----------|-------------|
| `WebViewPosition.FullScreen` | Covers the entire screen |
| `WebViewPosition.HalfScreenTop` | Top half of the screen |
| `WebViewPosition.HalfScreenBottom` | Bottom half of the screen |
| `WebViewPosition.Custom` | Custom position (iOS only) |

### Background Styles

```typescript
// Semi-transparent overlay
BackgroundStyle.dimmed(color?: string, opacity?: number)

// Solid color background
BackgroundStyle.color(color: string)

// iOS blur effect (falls back to dimmed on Android)
BackgroundStyle.blur(style?: BlurEffectStyle)

// No background
BackgroundStyle.none()
```

### Consent Methods

| Method | Description |
|--------|-------------|
| `checkAndOpen(jumpToSettings)` | Opens consent layer if consent is needed |
| `forceOpen(jumpToSettings)` | Always opens consent layer |
| `acceptAll()` | Accepts all consent options |
| `rejectAll()` | Rejects all consent options |
| `acceptVendors(ids)` | Accepts specific vendors |
| `rejectVendors(ids)` | Rejects specific vendors |
| `acceptPurposes(ids, updatePurpose)` | Accepts specific purposes |
| `rejectPurposes(ids, updateVendor)` | Rejects specific purposes |

### Status Methods

| Method | Returns |
|--------|---------|
| `getUserStatus()` | `Promise<UserStatus>` |
| `isConsentRequired()` | `Promise<boolean>` |
| `getStatusForPurpose(id)` | `Promise<string>` |
| `getStatusForVendor(id)` | `Promise<string>` |
| `getGoogleConsentModeStatus()` | `Promise<GoogleConsentModeStatus>` |

### Event Listeners

```typescript
// Consent received
addConsentListener((consent: string, data: Record<string, unknown>) => void)

// Consent layer shown
addShowConsentLayerListener(() => void)

// Consent layer closed
addCloseConsentLayerListener(() => void)

// Error occurred
addErrorListener((error: string) => void)

// Link clicked in consent layer
addClickLinkListener((url: string) => void)

// ATT status changed (iOS only)
addATTStatusChangeListener((event: ATTStatusChangeEvent) => void)
```

### iOS ATT Integration

```typescript
import { setATTStatus, ATTStatus } from 'cm-sdk-react-native-v3-new-arch';

// After requesting ATT permission
const status = await requestTrackingPermission();
await setATTStatus(
  status === 'authorized' ? ATTStatus.Authorized : ATTStatus.Denied
);
```

## Troubleshooting

### Module not found

Ensure you've run `pod install` after installation:

```bash
cd ios && pod install
```

### New Architecture not enabled

Add to your `gradle.properties`:

```properties
newArchEnabled=true
```

For iOS, ensure `RCT_NEW_ARCH_ENABLED=1` is set in your Podfile.

### Consent layer not showing

1. Verify your CMP configuration is correct
2. Check that `checkAndOpen` is being called
3. Listen for errors using `addErrorListener`

## Example App

See the [example directory](./example) for a complete demo application showcasing all features.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](./LICENSE) for details.

## Links

- [Documentation](https://help.consentmanager.net/books/cmp/chapter/integration-into-your-app---v3)
- [npm Package](https://www.npmjs.com/package/cm-sdk-react-native-v3-new-arch)
- [GitHub Repository](https://github.com/iubenda/cm-sdk-react-native-v3)
