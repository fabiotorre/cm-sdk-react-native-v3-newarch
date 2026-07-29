/**
 * Tests for `resolveConsent`.
 *
 * Each native consent getter costs a full CMP page load, so the contract worth
 * protecting is: one resolution, one snapshot, read strictly after the
 * resolution (a snapshot taken before it has empty values on a cold install).
 */

jest.mock('react-native', () => {
  const nativeModule = {
    isConsentRequired: jest.fn(),
    getUserStatus: jest.fn(),
    getStatusForPurpose: jest.fn(),
    getStatusForVendor: jest.fn(),
  };

  return {
    TurboModuleRegistry: { getEnforcing: () => nativeModule },
    NativeModules: {},
    NativeEventEmitter: jest.fn(() => ({
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    })),
    Platform: {
      OS: 'ios',
      select: (obj: Record<string, unknown>) => obj.ios,
    },
    processColor: (color: unknown) => color,
  };
});

import { TurboModuleRegistry } from 'react-native';
import { resolveConsent } from '../index';

const native = TurboModuleRegistry.getEnforcing(
  'CmSdkReactNativeV3'
) as unknown as {
  isConsentRequired: jest.Mock;
  getUserStatus: jest.Mock;
  getStatusForPurpose: jest.Mock;
  getStatusForVendor: jest.Mock;
};

const userStatus = {
  status: 'choiceDoesntExist',
  vendors: { s2789: 'granted' },
  purposes: { c52: 'granted', c53: 'denied' },
  tcf: 'tcf-string',
  addtlConsent: '1~',
  regulation: 'GDPR',
};

describe('resolveConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    native.isConsentRequired.mockResolvedValue(true);
    native.getUserStatus.mockResolvedValue(userStatus);
  });

  it('returns the verdict, the resolved regulation and the snapshot', async () => {
    await expect(resolveConsent()).resolves.toEqual({
      consentRequired: true,
      regulation: 'GDPR',
      userStatus,
    });
  });

  it('reads the snapshot only after the resolution completed', async () => {
    const callOrder: string[] = [];
    native.isConsentRequired.mockImplementation(async () => {
      callOrder.push('isConsentRequired');
      return true;
    });
    native.getUserStatus.mockImplementation(async () => {
      callOrder.push('getUserStatus');
      return userStatus;
    });

    await resolveConsent();

    expect(callOrder).toEqual(['isConsentRequired', 'getUserStatus']);
  });

  it('costs exactly one resolution and one snapshot read', async () => {
    await resolveConsent();

    expect(native.isConsentRequired).toHaveBeenCalledTimes(1);
    expect(native.getUserStatus).toHaveBeenCalledTimes(1);
    expect(native.getStatusForPurpose).not.toHaveBeenCalled();
    expect(native.getStatusForVendor).not.toHaveBeenCalled();
  });

  it('surfaces an unresolved regulation as an empty string', async () => {
    native.getUserStatus.mockResolvedValue({ ...userStatus, regulation: '' });

    await expect(resolveConsent()).resolves.toMatchObject({
      consentRequired: true,
      regulation: '',
    });
  });

  it('propagates a failed resolution instead of returning a stale snapshot', async () => {
    native.isConsentRequired.mockRejectedValue(new Error('network down'));

    await expect(resolveConsent()).rejects.toThrow('network down');
    expect(native.getUserStatus).not.toHaveBeenCalled();
  });
});
