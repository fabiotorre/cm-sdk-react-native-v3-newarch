import React, { useState, useEffect } from 'react';
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
  BlurEffectStyle,
  ATTStatus,
  WebViewPosition,
  type WebViewConfig,
  isNewArchitectureEnabled,
  isTurboModuleEnabled,
  isConsentRequired,
} from 'cm-sdk-react-native-v3-new-arch';

const HomeScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [architectureInfo, setArchitectureInfo] = useState<{
    type: 'Legacy' | 'New Architecture';
    details: string;
  }>({ type: 'Legacy', details: 'Detecting...' });
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    [key: string]: number;
  }>({});

  // Set up event listeners
  useEffect(() => {
    // Store the event subscriptions so we can clean up later
    const subscriptions: EmitterSubscription[] = [];

    // Set up consent event listener
    subscriptions.push(
      addConsentListener((consent: string, _jsonObject: any) => {
        const message = `Consent received: ${consent.substring(0, 20)}...`;
        console.log(message);
        setEventLog((prev) => [...prev, message]);
        showToast(message);
      })
    );

    // Set up show consent layer listener
    subscriptions.push(
      addShowConsentLayerListener(() => {
        const message = 'Consent layer shown';
        console.log(message);
        setEventLog((prev) => [...prev, message]);
        showToast(message);
      })
    );

    // Set up close consent layer listener
    subscriptions.push(
      addCloseConsentLayerListener(() => {
        const message = 'Consent layer closed';
        console.log(message);
        setEventLog((prev) => [...prev, message]);
        showToast(message);
      })
    );

    // Set up error listener
    subscriptions.push(
      addErrorListener((error: string) => {
        const message = `Error: ${error}`;
        console.error(message);
        setEventLog((prev) => [...prev, message]);
        showToast(message);
      })
    );

    // Set up link click listener with conditional handling
    subscriptions.push(
      addClickLinkListener((url: string) => {
        const message = `Link clicked: ${url}`;
        console.log(message);
        setEventLog((prev) => [...prev, message]);

        if (url.includes('glitch')) {
          Alert.alert(
            'External Link Detected',
            `Opening Google URL in external browser: ${url}`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  showToast('Link opening cancelled');
                  setEventLog((prev) => [
                    ...prev,
                    'Google link cancelled by user',
                  ]);
                },
              },
              {
                text: 'Open',
                onPress: () => {
                  Linking.openURL(url)
                    .then(() => {
                      showToast('Google link opened in external browser');
                      setEventLog((prev) => [
                        ...prev,
                        'Google link opened externally',
                      ]);
                    })
                    .catch((error) => {
                      console.error('Error opening URL:', error);
                      showToast('Failed to open Google link');
                      setEventLog((prev) => [
                        ...prev,
                        `Error opening Google link: ${error.message}`,
                      ]);
                    });
                },
              },
            ]
          );
        } else {
          // For other URLs, just show a toast and let WebView handle them
          showToast(
            `Other link detected: ${url.substring(0, 50)}${url.length > 50 ? '...' : ''}`
          );
          setEventLog((prev) => [
            ...prev,
            'Other link will be handled by WebView',
          ]);
        }
      })
    );

    // Clean up listeners when component unmounts
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  useEffect(() => {
    detectArchitecture();
    initializeConsent();
  }, []);

  const detectArchitecture = () => {
    try {
      const isNewArch = isNewArchitectureEnabled();
      const hasTurboModule = isTurboModuleEnabled;

      if (isNewArch || hasTurboModule) {
        setArchitectureInfo({
          type: 'New Architecture',
          details: `TurboModule detected on ${Platform.OS}. Enhanced performance and type safety enabled. (TurboModule: ${hasTurboModule}, NewArch: ${isNewArch})`,
        });
        setEventLog((prev) => [
          ...prev,
          '🚀 New Architecture (TurboModule) detected!',
        ]);
      } else {
        setArchitectureInfo({
          type: 'Legacy',
          details: `Legacy Bridge detected on ${Platform.OS}. Using traditional NativeModules.`,
        });
        setEventLog((prev) => [...prev, '📱 Legacy Architecture detected']);
      }
    } catch (error) {
      setArchitectureInfo({
        type: 'Legacy',
        details: `Architecture detection failed: ${error}. Assuming Legacy Bridge.`,
      });
      setEventLog((prev) => [
        ...prev,
        `⚠️ Architecture detection error: ${error}`,
      ]);
    }
  };

  const initializeConsent = async () => {
    try {
      // ============================================
      // CONSENT LAYER UI CONFIGURATION EXAMPLES
      // ============================================
      // Uncomment ONE configuration to test different layouts and styles

      // 1. FULL SCREEN with blur background (iOS only, Android uses dimmed)
      // const webViewConfig: WebViewConfig = {
      //   position: WebViewPosition.FullScreen,
      //   backgroundStyle: BackgroundStyle.blur(BlurEffectStyle.Dark),
      //   cornerRadius: 0, // Ignored for full screen
      //   respectsSafeArea: true,
      //   allowsOrientationChanges: true,
      // };

      // 2. FULL SCREEN with dimmed background
      // const webViewConfig: WebViewConfig = {
      //   position: WebViewPosition.FullScreen,
      //   backgroundStyle: BackgroundStyle.dimmed('black', 0.7),
      //   cornerRadius: 0,
      //   respectsSafeArea: true,
      //   allowsOrientationChanges: true,
      // };

      // 3. HALF SCREEN BOTTOM with blur background (currently active)
//       const webViewConfig: WebViewConfig = {
//         position: WebViewPosition.HalfScreenBottom,
//         backgroundStyle: BackgroundStyle.blur(BlurEffectStyle.Dark),
//         cornerRadius: 20,
//         respectsSafeArea: true,
//         allowsOrientationChanges: true,
//       };

      // 4. HALF SCREEN BOTTOM with dimmed background
      const webViewConfig: WebViewConfig = {
        position: WebViewPosition.HalfScreenBottom,
        backgroundStyle: BackgroundStyle.dimmed('black', 0.5),
        cornerRadius: 25,
        respectsSafeArea: true,
        allowsOrientationChanges: true,
      };

      // 5. HALF SCREEN TOP with solid color background
      // const webViewConfig: WebViewConfig = {
      //   position: WebViewPosition.HalfScreenTop,
      //   backgroundStyle: BackgroundStyle.color('rgba(0, 0, 0, 0.8)'),
      //   cornerRadius: 15,
      //   respectsSafeArea: true,
      //   allowsOrientationChanges: true,
      // };

      // 6. HALF SCREEN TOP with no background
      // const webViewConfig: WebViewConfig = {
      //   position: WebViewPosition.HalfScreenTop,
      //   backgroundStyle: BackgroundStyle.none(),
      //   cornerRadius: 30,
      //   respectsSafeArea: true,
      //   allowsOrientationChanges: true,
      // };

      // 7. CUSTOM POSITION with blur background (iOS only, Android falls back to full screen)
      // Note: x, y, width, height in points for iOS
      // const webViewConfig: WebViewConfig = {
      //   position: WebViewPosition.Custom,
      //   customRect: { x: 20, y: 100, width: 350, height: 500 },
      //   backgroundStyle: BackgroundStyle.blur(BlurEffectStyle.ExtraLight),
      //   cornerRadius: 12,
      //   respectsSafeArea: false,
      //   allowsOrientationChanges: false,
      // };

      // 8. CUSTOM POSITION centered with dimmed background
      // const webViewConfig: WebViewConfig = {
      //   position: WebViewPosition.Custom,
      //   customRect: { x: 50, y: 200, width: 300, height: 400 },
      //   backgroundStyle: BackgroundStyle.dimmed('blue', 0.3),
      //   cornerRadius: 20,
      //   respectsSafeArea: true,
      //   allowsOrientationChanges: true,
      // };

      await CmSdkReactNativeV3.setWebViewConfig(webViewConfig);

      await CmSdkReactNativeV3.setUrlConfig({
        id: 'f5e3b73592c3c',
        domain: 'delivery.consentmanager.net',
        language: 'EN',
        appName: 'CMDemoAppReactNative',
        noHash: true,
      });

      // iOS-only: Set ATT status if on iOS
      if (Platform.OS === 'ios') {
        // ATT status values come from AppTrackingTransparency (0–3). Use enum for clarity.
        await CmSdkReactNativeV3.setATTStatus(ATTStatus.NotDetermined);
      }

//       await CmSdkReactNativeV3.checkAndOpen(false);
//       console.log(
//         'CMPManager initialized and open consent layer opened if necessary'
//       );
    } catch (error) {
      console.error('Error initializing consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleApiCall = async (
    apiCall: () => Promise<any>,
    successMessage: (result: any) => string,
    errorMessage: string = 'An error occurred',
    methodName?: string
  ) => {
    const startTime = Date.now();
    try {
      const result = await apiCall();
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (methodName) {
        setPerformanceMetrics((prev) => ({
          ...prev,
          [methodName]: duration,
        }));
        setEventLog((prev) => [
          ...prev,
          `⚡ ${methodName}: ${duration}ms (${architectureInfo.type})`,
        ]);
      }

      showToast(successMessage(result));
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (methodName) {
        setEventLog((prev) => [
          ...prev,
          `❌ ${methodName} failed after ${duration}ms: ${error}`,
        ]);
      }

      showToast(`${errorMessage}: ${error}`);
    }
  };

  const buttons = [
    {
      title: 'Get User Status',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.getUserStatus,
          (result) =>
            `User Status: ${JSON.stringify(result).substring(0, 100)}...`,
          'Failed to get user status',
          'getUserStatus'
        ),
    },
    {
      title: 'Is Consent Required',
      onPress: () =>
        handleApiCall(
          isConsentRequired,
          (result) => `Consent is required? ${result}`,
          'Failed to check if consent is required',
          'isConsentRequired'
        ),
    },
    {
      title: 'Get CMP String',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.exportCMPInfo,
          (result) => `CMP String: ${result}`,
          'Failed to export CMP info',
          'exportCMPInfo'
        ),
    },
    {
      title: 'Get Status for Purpose c53',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.getStatusForPurpose('c53'),
          (result) => `Purpose Status: ${result}`,
          'Failed to get purpose status',
          'getStatusForPurpose'
        ),
    },
    {
      title: 'Get Status for Vendor s2789',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.getStatusForVendor('s2789'),
          (result) => `Vendor Status: ${result}`,
          'Failed to get vendor status',
          'getStatusForVendor'
        ),
    },
    {
      title: 'Get Google Consent Mode Status',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.getGoogleConsentModeStatus,
          (result) => `Google Consent: ${JSON.stringify(result)}`,
          'Failed to get Google consent mode',
          'getGoogleConsentModeStatus'
        ),
    },
    {
      title: 'Enable Purposes c52 and c53',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.acceptPurposes(['c52', 'c53'], true),
          () => 'Purposes enabled',
          'Failed to enable purposes',
          'acceptPurposes'
        ),
    },
    {
      title: 'Disable Purposes c52 and c53',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.rejectPurposes(['c52', 'c53'], true),
          () => 'Purposes disabled',
          'Failed to disable purposes',
          'rejectPurposes'
        ),
    },
    {
      title: 'Enable Vendors s2790 and s2791',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.acceptVendors(['s2790', 's2791']),
          () => 'Vendors Enabled',
          'Failed to enable vendors',
          'acceptVendors'
        ),
    },
    {
      title: 'Disable Vendors s2790 and s2791',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.rejectVendors(['s2790', 's2791']),
          () => 'Vendors Disabled',
          'Failed to disable vendors',
          'rejectVendors'
        ),
    },
    {
      title: 'Reject All',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.rejectAll,
          () => 'All consents rejected',
          'Failed to reject all',
          'rejectAll'
        ),
    },
    {
      title: 'Accept All',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.acceptAll,
          () => 'All consents accepted',
          'Failed to accept all',
          'acceptAll'
        ),
    },
    {
      title: 'Check and Open Consent Layer',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.checkAndOpen(false),
          () => 'Check and Open operation completed'
        ),
    },
    {
      title: 'Check and Open Settings Page',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.checkAndOpen(true),
          () => 'Settings page opened if needed'
        ),
    },
    {
      title: 'Force Open Consent Layer',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.forceOpen(false),
          () => 'Consent Layer opened'
        ),
    },
    {
      title: 'Force Open Settings Page',
      onPress: () =>
        handleApiCall(
          () => CmSdkReactNativeV3.forceOpen(true),
          () => 'Settings page opened'
        ),
    },
    {
      title: 'Import CMP String',
      onPress: () =>
        handleApiCall(
          () =>
            CmSdkReactNativeV3.importCMPInfo(
              'Q1FaRWVQQVFaRWVQQUFmYjRCRU5DQUZnQVBMQUFFTEFBQWlnRjV3QVFGNWdYbkFCQVhtQUFBI181MV81Ml81NF8jX3MxMDUyX3MxX3MyNl9zMjYxMl9zOTA1X3MxNDQ4X2M3MzczN19VXyMxLS0tIw'
            ),
          () => 'New consent string imported successfully'
        ),
    },
    {
      title: 'Reset all CMP Info',
      onPress: () =>
        handleApiCall(
          CmSdkReactNativeV3.resetConsentManagementData,
          () => 'All consents reset'
        ),
    },
  ];

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
        <Text style={styles.title}>CM React Native DemoApp v3.6.0</Text>
        <Text style={styles.subtitle}>New Architecture Compatibility Test</Text>

        {/* Architecture Info Section */}
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
            Architecture: {architectureInfo.type}
          </Text>
          <Text style={styles.infoDetails}>{architectureInfo.details}</Text>
        </View>

        {/* Performance Metrics Section */}
        {Object.keys(performanceMetrics).length > 0 && (
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>
              ⚡ Performance Metrics (ms):
            </Text>
            {Object.entries(performanceMetrics).map(([method, time]) => (
              <Text key={method} style={styles.metricText}>
                {method}: {time}ms
              </Text>
            ))}
          </View>
        )}

        {/* Event Logger Section */}
        <View style={styles.eventLogContainer}>
          <Text style={styles.eventLogTitle}>Event Log:</Text>
          <ScrollView style={styles.eventLogScrollView}>
            {eventLog.length === 0 ? (
              <Text style={styles.noEventsText}>No events received yet</Text>
            ) : (
              eventLog.map((event, index) => (
                <Text key={index} style={styles.eventText}>
                  {event}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {buttons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={button.onPress}
          >
            <Text style={styles.buttonText}>{button.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

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
