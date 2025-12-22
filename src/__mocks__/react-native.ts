// Mock for react-native module

export const mockNativeModule = {
  setUrlConfig: jest.fn().mockResolvedValue(undefined),
  setWebViewConfig: jest.fn().mockResolvedValue(undefined),
  setATTStatus: jest.fn().mockResolvedValue(undefined),
  checkAndOpen: jest.fn().mockResolvedValue(true),
  forceOpen: jest.fn().mockResolvedValue(true),
  getUserStatus: jest.fn().mockResolvedValue({
    status: 'hasConsent',
    vendors: { s123: 'accepted' },
    purposes: { c52: 'rejected' },
    tcf: 'test-tcf-string',
    addtlConsent: '1~',
    regulation: 'gdpr',
  }),
  isConsentRequired: jest.fn().mockResolvedValue(true),
  getStatusForPurpose: jest.fn().mockResolvedValue('accepted'),
  getStatusForVendor: jest.fn().mockResolvedValue('rejected'),
  getGoogleConsentModeStatus: jest.fn().mockResolvedValue({
    ad_storage: 'granted',
    analytics_storage: 'denied',
  }),
  exportCMPInfo: jest.fn().mockResolvedValue('exported-cmp-string'),
  importCMPInfo: jest.fn().mockResolvedValue(true),
  resetConsentManagementData: jest.fn().mockResolvedValue(true),
  acceptVendors: jest.fn().mockResolvedValue(true),
  rejectVendors: jest.fn().mockResolvedValue(true),
  acceptPurposes: jest.fn().mockResolvedValue(true),
  rejectPurposes: jest.fn().mockResolvedValue(true),
  acceptAll: jest.fn().mockResolvedValue(true),
  rejectAll: jest.fn().mockResolvedValue(true),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

export const mockEventEmitterInstance = {
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeAllListeners: jest.fn(),
};

export const NativeModules = {
  CmSdkReactNativeV3: mockNativeModule,
};

export const NativeEventEmitter = jest.fn(() => mockEventEmitterInstance);

export const Platform = {
  OS: 'ios' as const,
  select: <T extends Record<string, unknown>>(obj: T) => obj.ios ?? obj.default,
};

export const processColor = jest.fn((color: string | number | undefined) => {
  if (color === 'invalid-color-xyz') return null;
  return typeof color === 'number' ? color : 0xff000000;
});

