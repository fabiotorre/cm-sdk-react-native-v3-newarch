/**
 * Platform-gated wrappers must reject as Promises when the native method is
 * missing, so callers using `.catch()` observe the failure instead of a sync throw.
 */

jest.mock('react-native', () => {
  const nativeModule: Record<string, unknown> = {
    isConsentRequired: jest.fn().mockResolvedValue(false),
    getUserStatus: jest.fn().mockResolvedValue({
      status: 'choiceDoesntExist',
      vendors: {},
      purposes: {},
      tcf: '',
      addtlConsent: '',
      regulation: '',
    }),
  };

  return {
    TurboModuleRegistry: { getEnforcing: () => nativeModule },
    NativeModules: {},
    NativeEventEmitter: jest.fn(() => ({
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    })),
    Platform: {
      OS: 'android',
      select: (obj: Record<string, unknown>) => obj.android,
    },
    processColor: (color: unknown) => color,
  };
});

import { TurboModuleRegistry } from 'react-native';
import { setAutomaticConsentUpdatesEnabled } from '../index';

const native = TurboModuleRegistry.getEnforcing(
  'CmSdkReactNativeV3'
) as Record<string, unknown>;

describe('getNativeMethod-backed wrappers', () => {
  it('rejects the Promise when the native method is missing', async () => {
    delete native.setAutomaticConsentUpdatesEnabled;

    await expect(setAutomaticConsentUpdatesEnabled(true)).rejects.toThrow(
      /setAutomaticConsentUpdatesEnabled is not available on android/
    );
  });

  it('forwards to the native method when it exists', async () => {
    const impl = jest.fn().mockResolvedValue(undefined);
    native.setAutomaticConsentUpdatesEnabled = impl;

    await expect(setAutomaticConsentUpdatesEnabled(true)).resolves.toBeUndefined();
    expect(impl).toHaveBeenCalledWith(true);
  });
});
