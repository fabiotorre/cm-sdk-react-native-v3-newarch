# consentmanager CMP SDK - New Architecture

# cm-sdk-react-native-v3-newarch

cm-sdk-react-native-v3-newarch is a comprehensive Consent Management Platform (CMP) SDK bridge for React Native with **New Architecture support only**.

## ✨ New Architecture (TurboModules)

**Version 4.1.0 - New Architecture ONLY**

- ✅ **Full TurboModule implementation** with proper protocol conformance
- ✅ **React Native 0.74+** required
- ✅ **Bridgeless mode** compatible
- ✅ **Type safety** with automatic code generation
- ⚠️ **No backward compatibility** - For legacy architecture, use v3.x

## Requirements

- React Native 0.74 or higher
- New Architecture enabled (`RCT_NEW_ARCH_ENABLED=1`)
- iOS 13.4+
- Android minSdkVersion 24+

## Installation

```bash
npm install cm-sdk-react-native-v3-newarch
# or
yarn add cm-sdk-react-native-v3-newarch
```

## UI Configuration

The SDK provides comprehensive options to customize the consent layer appearance:

### Positions
- **FullScreen**: Covers the entire screen
- **HalfScreenBottom**: Covers the bottom half of the screen
- **HalfScreenTop**: Covers the top half of the screen
- **Custom**: Custom position with specific frame (iOS only, Android falls back to FullScreen)

### Background Styles
- **Dimmed**: Semi-transparent color overlay with configurable color and opacity
- **Blur**: iOS system blur effect (ExtraLight, Light, Dark) - iOS only, Android uses dimmed
- **Color**: Solid color background
- **None**: No background styling

### Example
```typescript
import CmSdkReactNativeV3, {
  WebViewPosition,
  BackgroundStyle,
  BlurEffectStyle,
  type WebViewConfig,
} from 'cm-sdk-react-native-v3-new-arch';

const webViewConfig: WebViewConfig = {
  position: WebViewPosition.HalfScreenBottom,
  backgroundStyle: BackgroundStyle.blur(BlurEffectStyle.Dark),
  cornerRadius: 20,
  respectsSafeArea: true,
  allowsOrientationChanges: true,
};

await CmSdkReactNativeV3.setWebViewConfig(webViewConfig);
```

For more examples, check `example/src/HomeScreen.tsx` which includes 8 different UI configurations.

## Important Notes

This version (4.x) is a **breaking change** that requires New Architecture. If you need to support the old architecture, please use version 3.x instead.

For further information, please refer to [our documentation](https://help.consentmanager.net/books/cmp/chapter/integration-into-your-app---v3)

## License

CMPManager is available under the MIT license. See the LICENSE file for more info.
