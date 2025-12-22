import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  SafeAreaView,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import type { EmitterSubscription } from 'react-native';
import CmSdkReactNativeV3, {
  addConsentListener,
  addShowConsentLayerListener,
  addCloseConsentLayerListener,
  addErrorListener,
  addClickLinkListener,
  BackgroundStyle,
  ATTStatus,
  WebViewPosition,
  type WebViewConfig,
  isNewArchitectureEnabled,
  isTurboModuleEnabled,
  isConsentRequired,
} from 'cm-sdk-react-native-v3-new-arch';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** CMP configuration - replace with your own values */
const CMP_CONFIG = {
  id: 'f5e3b73592c3c', // Replace this by your own Code-ID
  domain: 'delivery.consentmanager.net',
  language: 'EN',
  appName: 'CMDemoAppReactNative',
  noHash: true,
} as const;

/** Default WebView configuration */
const DEFAULT_WEBVIEW_CONFIG: WebViewConfig = {
  position: WebViewPosition.HalfScreenBottom,
  backgroundStyle: BackgroundStyle.dimmed('black', 0.5),
  cornerRadius: 25,
  respectsSafeArea: true,
  allowsOrientationChanges: true,
};

// =============================================================================
// TYPES
// =============================================================================

interface ArchitectureInfo {
  type: 'Legacy' | 'New Architecture';
  details: string;
}

interface ButtonConfig {
  title: string;
  onPress: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

const HomeScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [architectureInfo, setArchitectureInfo] = useState<ArchitectureInfo>({
    type: 'Legacy',
    details: 'Detecting...',
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<
    Record<string, number>
  >({});

  // Toast timeout ref for cleanup
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =============================================================================
  // Toast with proper cleanup
  // =============================================================================
  const showToast = useCallback((message: string) => {
    // Clear existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // =============================================================================
  // Event Listeners Setup
  // =============================================================================
  useEffect(() => {
    const subscriptions: EmitterSubscription[] = [];

    subscriptions.push(
      addConsentListener((consent: string, _data: Record<string, unknown>) => {
        const message = `Consent received: ${consent.substring(0, 20)}...`;
        console.log(message);
        setEventLog((prev) => [...prev, message]);
        showToast(message);
      })
    );

    subscriptions.push(
      addShowConsentLayerListener(() => {
        const message = 'Consent layer shown';
        console.log(message);
        setEventLog((prev) => [...prev, message]);
        showToast(message);
      })
    );

    subscriptions.push(
      addCloseConsentLayerListener(() => {
        const message = 'Consent layer closed';
        console.log(message);
        setEventLog((prev) => [...prev, message]);
        showToast(message);
      })
    );

    subscriptions.push(
      addErrorListener((error: string) => {
        const message = `Error: ${error}`;
        console.error(message);
        setEventLog((prev) => [...prev, message]);
        showToast(message);
      })
    );

    subscriptions.push(
      addClickLinkListener((url: string) => {
        const message = `Link clicked: ${url}`;
        console.log(message);
        setEventLog((prev) => [...prev, message]);

        if (url.includes('glitch')) {
          Alert.alert(
            'External Link Detected',
            `Opening URL in external browser: ${url}`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open',
                onPress: () => {
                  Linking.openURL(url).catch((err) =>
                    console.error('Error opening URL:', err)
                  );
                },
              },
            ]
          );
        } else {
          showToast(`Link: ${url.substring(0, 50)}${url.length > 50 ? '...' : ''}`);
        }
      })
    );

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [showToast]);

  // =============================================================================
  // Architecture Detection
  // =============================================================================
  const detectArchitecture = useCallback(() => {
    try {
      const isNewArch = isNewArchitectureEnabled();
      const hasTurboModule = isTurboModuleEnabled;

      if (isNewArch || hasTurboModule) {
        setArchitectureInfo({
          type: 'New Architecture',
          details: `TurboModule on ${Platform.OS}. (TM: ${hasTurboModule}, NA: ${isNewArch})`,
        });
        setEventLog((prev) => [...prev, '🚀 New Architecture detected!']);
      } else {
        setArchitectureInfo({
          type: 'Legacy',
          details: `Legacy Bridge on ${Platform.OS}.`,
        });
        setEventLog((prev) => [...prev, '📱 Legacy Architecture detected']);
      }
    } catch (error) {
      setArchitectureInfo({
        type: 'Legacy',
        details: `Detection failed: ${error}`,
      });
    }
  }, []);

  // =============================================================================
  // CMP Initialization
  // =============================================================================
  const initializeConsent = useCallback(async () => {
    try {
      await CmSdkReactNativeV3.setWebViewConfig(DEFAULT_WEBVIEW_CONFIG);
      await CmSdkReactNativeV3.setUrlConfig(CMP_CONFIG);

      if (Platform.OS === 'ios') {
        await CmSdkReactNativeV3.setATTStatus(ATTStatus.NotDetermined);
      }
    } catch (error) {
      console.error('Error initializing consent:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    detectArchitecture();
    initializeConsent();
  }, [detectArchitecture, initializeConsent]);

  // =============================================================================
  // API Call Handler with Performance Tracking
  // =============================================================================
  const handleApiCall = useCallback(
    async (
      apiCall: () => Promise<unknown>,
      successMessage: (result: unknown) => string,
      errorMessage = 'An error occurred',
      methodName?: string
    ) => {
      const startTime = Date.now();
      try {
        const result = await apiCall();
        const duration = Date.now() - startTime;

        if (methodName) {
          setPerformanceMetrics((prev) => ({ ...prev, [methodName]: duration }));
          setEventLog((prev) => [
            ...prev,
            `⚡ ${methodName}: ${duration}ms (${architectureInfo.type})`,
          ]);
        }

        showToast(successMessage(result));
      } catch (error) {
        const duration = Date.now() - startTime;
        if (methodName) {
          setEventLog((prev) => [
            ...prev,
            `❌ ${methodName} failed after ${duration}ms: ${error}`,
          ]);
        }
        showToast(`${errorMessage}: ${error}`);
      }
    },
    [architectureInfo.type, showToast]
  );

  // =============================================================================
  // Button Configurations
  // =============================================================================
  const buttons: ButtonConfig[] = [
    {
      title: 'Get User Status',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.getUserStatus,
          (r) => `Status: ${JSON.stringify(r).substring(0, 100)}...`,
          'Failed to get user status',
          'getUserStatus'
        ),
    },
    {
      title: 'Is Consent Required',
      onPress: () =>
        handleApiCall(
          isConsentRequired,
          (r) => `Consent required: ${r}`,
          'Failed to check consent',
          'isConsentRequired'
        ),
    },
    {
      title: 'Get CMP String',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.exportCMPInfo,
          (r) => `CMP: ${r}`,
          'Failed to export CMP',
          'exportCMPInfo'
        ),
    },
    {
      title: 'Get Status for Purpose c53',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.getStatusForPurpose('c53'),
          (r) => `Purpose: ${r}`,
          'Failed',
          'getStatusForPurpose'
        ),
    },
    {
      title: 'Get Status for Vendor s2789',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.getStatusForVendor('s2789'),
          (r) => `Vendor: ${r}`,
          'Failed',
          'getStatusForVendor'
        ),
    },
    {
      title: 'Google Consent Mode',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.getGoogleConsentModeStatus,
          (r) => `GCM: ${JSON.stringify(r)}`,
          'Failed',
          'getGoogleConsentModeStatus'
        ),
    },
    {
      title: 'Accept Purposes c52, c53',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.acceptPurposes(['c52', 'c53'], true),
          () => 'Purposes accepted',
          'Failed',
          'acceptPurposes'
        ),
    },
    {
      title: 'Reject Purposes c52, c53',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.rejectPurposes(['c52', 'c53'], true),
          () => 'Purposes rejected',
          'Failed',
          'rejectPurposes'
        ),
    },
    {
      title: 'Accept Vendors s2790 and s2791',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.acceptVendors(['s2790', 's2791']),
          () => 'Vendors accepted',
          'Failed',
          'acceptVendors'
        ),
    },
    {
      title: 'Reject Vendors s2790 and s2791',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.rejectVendors(['s2790', 's2791']),
          () => 'Vendors rejected',
          'Failed',
          'rejectVendors'
        ),
    },
    {
      title: 'Reject All',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.rejectAll,
          () => 'All rejected',
          'Failed',
          'rejectAll'
        ),
    },
    {
      title: 'Accept All',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.acceptAll,
          () => 'All accepted',
          'Failed',
          'acceptAll'
        ),
    },
    {
      title: 'Check and Open Consent Layer',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.checkAndOpen(false),
          () => 'Check completed'
        ),
    },
    {
      title: 'Check and Open Settings Page',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.checkAndOpen(true),
          () => 'Settings opened'
        ),
    },
    {
      title: 'Force Open Consent Layer',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.forceOpen(false),
          () => 'Layer opened'
        ),
    },
    {
      title: 'Force Open Settings Page',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.forceOpen(true),
          () => 'Settings opened'
        ),
    },
    {
      title: 'Reset CMP Data',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.resetConsentManagementData,
          () => 'Data reset'
        ),
    },
  ];

  // =============================================================================
  // Render
  // =============================================================================
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Initializing Consent Manager...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>CM React Native Demo</Text>
        <Text style={styles.subtitle}>New Architecture Test</Text>

        {/* Architecture Info */}
        <View
          style={[
            styles.infoContainer,
            architectureInfo.type === 'New Architecture'
              ? styles.newArchContainer
              : styles.legacyArchContainer,
          ]}
        >
          <Text style={styles.infoTitle}>
            {architectureInfo.type === 'New Architecture' ? '🚀' : '📱'}{' '}
            {architectureInfo.type}
          </Text>
          <Text style={styles.infoDetails}>{architectureInfo.details}</Text>
        </View>

        {/* Performance Metrics */}
        {Object.keys(performanceMetrics).length > 0 && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>⚡ Performance (ms):</Text>
            {Object.entries(performanceMetrics).map(([method, time]) => (
              <Text key={method} style={styles.metricText}>
                {method}: {time}ms
              </Text>
            ))}
          </View>
        )}

        {/* Event Log */}
        <View style={styles.eventLogContainer}>
          <Text style={styles.eventLogTitle}>Event Log:</Text>
          <ScrollView style={styles.eventLogScrollView}>
            {eventLog.length === 0 ? (
              <Text style={styles.noEventsText}>No events yet</Text>
            ) : (
              eventLog.map((event, idx) => (
                <Text key={`event-${idx}-${event.substring(0, 10)}`} style={styles.eventText}>
                  {event}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        {buttons.map((button) => (
          <TouchableOpacity
            key={button.title}
            style={styles.button}
            onPress={button.onPress}
          >
            <Text style={styles.buttonText}>{button.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Toast */}
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#555',
  },
  infoContainer: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
  },
  newArchContainer: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  legacyArchContainer: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  metricsContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1976d2',
  },
  metricText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  eventLogContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  eventLogTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventLogScrollView: {
    maxHeight: 150,
  },
  noEventsText: {
    fontStyle: 'italic',
    color: '#888',
  },
  eventText: {
    marginBottom: 3,
    fontSize: 12,
  },
  button: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  toastText: {
    color: 'white',
    textAlign: 'center',
  },
});

export default HomeScreen;
