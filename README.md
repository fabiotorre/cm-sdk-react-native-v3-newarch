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
| `resolveConsent()` | `Promise<ConsentResolution>` |
| `getUserStatus()` | `Promise<UserStatus>` |
| `isConsentRequired()` | `Promise<boolean>` |
| `getStatusForPurpose(id)` | `Promise<string>` |
| `getStatusForVendor(id)` | `Promise<string>` |
| `getGoogleConsentModeStatus()` | `Promise<GoogleConsentModeStatus>` |

**Breaking (Android status strings):** purpose/vendor status values are now
`granted` / `denied` / `choiceDoesntExist` on both platforms. Older Android builds
returned Kotlin enum names (`GRANTED`, `DENIED`, `CHOICE_DOESNT_EXIST`). Update any
string comparisons before upgrading. `UserStatus.status` / deprecated
`hasUserChoice` use `choiceExists` / `choiceDoesntExist`.

### Cold start and read cost

Not all of these calls cost the same. `isConsentRequired()`, `checkAndOpen()` and
`forceOpen()` drive the CMP WebView and pay a network round trip. The status
getters — `getUserStatus()`, `getStatusForPurpose()`, `getStatusForVendor()` —
read state the native SDK already holds, so they are comparatively cheap.

Measured on an iPhone 16 Pro simulator, cold install, EU/GDPR, against a CMP
endpoint answering in ~160 ms: `isConsentRequired()` 1.2 s median,
`getUserStatus()` ~50 ms, launch to visible banner 2.7 s. Most of
`isConsentRequired()` is spent inside the SDK and WebView after the network has
already completed, so a slower device or connection scales it up sharply.

**Budget for one resolution, not several.** `resolveConsent()` exists to give you
the verdict and a full snapshot together, in that order, from a single round trip:

```typescript
const { consentRequired, userStatus } = await resolveConsent();
const analytics = userStatus.purposes.c52 ?? 'choiceDoesntExist';
```

Reading individual purposes with `getStatusForPurpose()` is not expensive, but it
tells you nothing `userStatus.purposes` does not already contain.

**Do not branch on `regulation` at resolution time.** On a cold install the field
is an empty string even when `isConsentRequired()` returns `true` and the server
resolved GDPR. This is the native SDK's behaviour and this wrapper passes it
through unchanged, so treat an empty value as "unknown" rather than "no
regulation", and do not use it to choose between GDPR and CCPA UI.

**Don't hold the splash on the resolution.** Start it during boot, keep the
promise, and await it only where the consent decision is made. The CMP round trip
then overlaps with the rest of your startup instead of extending it:

```typescript
await setWebViewConfig({ position: WebViewPosition.HalfScreenBottom });
await setUrlConfig({ id: '...', domain: '...', language: 'EN', appName: 'MyApp' });

// Kick off, but do not await here.
const consent = resolveConsent();

// ... render your app ...

// Await where the banner decision actually happens.
const { consentRequired } = await consent;
if (consentRequired) {
  await checkAndOpen(false);
}
```

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
