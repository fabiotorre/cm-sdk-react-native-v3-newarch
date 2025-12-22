/**
 * Comprehensive test suite for cm-sdk-react-native-v3
 *
 * This test file covers:
 * - Background style factory functions
 * - Enum value verification
 * - Type safety validation
 *
 * Note: Tests for functions that interact with the native module
 * require the react-native test environment with proper mocking.
 * These unit tests verify the JavaScript-only functionality.
 */

import {
  BackgroundStyle,
  WebViewPosition,
  BackgroundStyleType,
  BlurEffectStyle,
  ATTStatus,
} from '../NativeCmSdkReactNativeV3';

describe('cm-sdk-react-native-v3', () => {
  describe('BackgroundStyle Factory', () => {
    it('creates dimmed background style with all parameters', () => {
      const style = BackgroundStyle.dimmed('black', 0.5);
      expect(style).toEqual({
        type: 'dimmed',
        color: 'black',
        opacity: 0.5,
      });
    });

    it('creates dimmed background style with partial parameters', () => {
      const style = BackgroundStyle.dimmed('red');
      expect(style).toEqual({
        type: 'dimmed',
        color: 'red',
        opacity: undefined,
      });
    });

    it('creates dimmed background style with no parameters', () => {
      const style = BackgroundStyle.dimmed();
      expect(style).toEqual({
        type: 'dimmed',
        color: undefined,
        opacity: undefined,
      });
    });

    it('creates color background style', () => {
      const style = BackgroundStyle.color('red');
      expect(style).toEqual({
        type: 'color',
        color: 'red',
      });
    });

    it('creates color background style with numeric color', () => {
      const style = BackgroundStyle.color(0xff0000);
      expect(style).toEqual({
        type: 'color',
        color: 0xff0000,
      });
    });

    it('creates blur background style with Light effect', () => {
      const style = BackgroundStyle.blur(BlurEffectStyle.Light);
      expect(style).toEqual({
        type: 'blur',
        blurEffectStyle: BlurEffectStyle.Light,
      });
    });

    it('creates blur background style with ExtraLight effect', () => {
      const style = BackgroundStyle.blur(BlurEffectStyle.ExtraLight);
      expect(style).toEqual({
        type: 'blur',
        blurEffectStyle: BlurEffectStyle.ExtraLight,
      });
    });

    it('creates blur background style with Dark effect (default)', () => {
      const style = BackgroundStyle.blur();
      expect(style).toEqual({
        type: 'blur',
        blurEffectStyle: BlurEffectStyle.Dark,
      });
    });

    it('creates none background style', () => {
      const style = BackgroundStyle.none();
      expect(style).toEqual({
        type: 'none',
      });
    });
  });

  describe('WebViewPosition Enum', () => {
    it('has correct FullScreen value', () => {
      expect(WebViewPosition.FullScreen).toBe('fullScreen');
    });

    it('has correct HalfScreenTop value', () => {
      expect(WebViewPosition.HalfScreenTop).toBe('halfScreenTop');
    });

    it('has correct HalfScreenBottom value', () => {
      expect(WebViewPosition.HalfScreenBottom).toBe('halfScreenBottom');
    });

    it('has correct Custom value', () => {
      expect(WebViewPosition.Custom).toBe('custom');
    });
  });

  describe('BackgroundStyleType Enum', () => {
    it('has correct Dimmed value', () => {
      expect(BackgroundStyleType.Dimmed).toBe('dimmed');
    });

    it('has correct Color value', () => {
      expect(BackgroundStyleType.Color).toBe('color');
    });

    it('has correct Blur value', () => {
      expect(BackgroundStyleType.Blur).toBe('blur');
    });

    it('has correct None value', () => {
      expect(BackgroundStyleType.None).toBe('none');
    });
  });

  describe('BlurEffectStyle Enum', () => {
    it('has correct Light value', () => {
      expect(BlurEffectStyle.Light).toBe('light');
    });

    it('has correct Dark value', () => {
      expect(BlurEffectStyle.Dark).toBe('dark');
    });

    it('has correct ExtraLight value', () => {
      expect(BlurEffectStyle.ExtraLight).toBe('extraLight');
    });
  });

  describe('ATTStatus Enum', () => {
    it('has correct NotDetermined value', () => {
      expect(ATTStatus.NotDetermined).toBe(0);
    });

    it('has correct Restricted value', () => {
      expect(ATTStatus.Restricted).toBe(1);
    });

    it('has correct Denied value', () => {
      expect(ATTStatus.Denied).toBe(2);
    });

    it('has correct Authorized value', () => {
      expect(ATTStatus.Authorized).toBe(3);
    });

    it('values match Apple ATTrackingManager authorization values', () => {
      // Verify enum values match iOS ATTrackingManager.AuthorizationStatus
      expect(ATTStatus.NotDetermined).toBe(0);
      expect(ATTStatus.Restricted).toBe(1);
      expect(ATTStatus.Denied).toBe(2);
      expect(ATTStatus.Authorized).toBe(3);
    });
  });

  describe('Type Safety', () => {
    it('BackgroundStyle factory returns correct type for dimmed', () => {
      const style = BackgroundStyle.dimmed('black', 0.5);
      expect(style.type).toBe('dimmed');
      if (style.type === 'dimmed') {
        expect(style.color).toBe('black');
        expect(style.opacity).toBe(0.5);
      }
    });

    it('BackgroundStyle factory returns correct type for blur', () => {
      const style = BackgroundStyle.blur(BlurEffectStyle.Light);
      expect(style.type).toBe('blur');
      if (style.type === 'blur') {
        expect(style.blurEffectStyle).toBe(BlurEffectStyle.Light);
      }
    });

    it('BackgroundStyle factory returns correct type for color', () => {
      const style = BackgroundStyle.color('#ff0000');
      expect(style.type).toBe('color');
      if (style.type === 'color') {
        expect(style.color).toBe('#ff0000');
      }
    });
  });
});
