package com.cmsdkreactnativev3

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.fbreact.specs.NativeCmSdkReactNativeV3Spec
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import net.consentmanager.cm_sdk_android_v3.CMPManager
import net.consentmanager.cm_sdk_android_v3.CMPManagerDelegate
import net.consentmanager.cm_sdk_android_v3.ConsentLayerUIConfig
import net.consentmanager.cm_sdk_android_v3.ConsentStatus
import net.consentmanager.cm_sdk_android_v3.UrlConfig
import net.consentmanager.cm_sdk_android_v3.UserConsentStatus

class CmSdkReactNativeV3Module(reactContext: ReactApplicationContext) :
  NativeCmSdkReactNativeV3Spec(reactContext), LifecycleEventListener, CMPManagerDelegate {

  private lateinit var cmpManager: CMPManager
  private val scope = CoroutineScope(Dispatchers.Main)
  private var urlConfig: UrlConfig
  private var webViewConfig: ConsentLayerUIConfig
  private val uiThreadHandler = Handler(Looper.getMainLooper())
  private var isInitialized = false
  private var storedATTStatus: Int = 0


  init {
    reactContext.addLifecycleEventListener(this)
    urlConfig = UrlConfig("", "", "", "")
    webViewConfig = ConsentLayerUIConfig(
      position = ConsentLayerUIConfig.Position.FULL_SCREEN,
      backgroundStyle = ConsentLayerUIConfig.BackgroundStyle.dimmed(android.graphics.Color.BLACK, 0.5f),
      cornerRadius = 0f,
      respectsSafeArea = true,
      isCancelable = false,
      allowsOrientationChanges = true
    )
  }

  override fun getName(): String = NAME
  
  override fun invalidate() {
    super.invalidate()
    if (::cmpManager.isInitialized) {
      cmpManager.onActivityDestroyed()
    }
  }

  private fun runOnUiThread(runnable: Runnable) {
    uiThreadHandler.post(runnable)
  }

  @ReactMethod
  override fun addListener(eventName: String?) {
    // Required for NativeEventEmitter - React Native calls this automatically
  }

  @ReactMethod
  override fun removeListeners(count: Double) {
    // Required for NativeEventEmitter - React Native calls this automatically
  }





  @ReactMethod
  override fun setATTStatus(status: Double, promise: Promise) {
    try {
      this.storedATTStatus = status.toInt()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to set ATT status: ${e.message}")
    }
  }

  @ReactMethod
  override fun setWebViewConfig(config: ReadableMap, promise: Promise) {
    runOnUiThread {
      try {
        val position = when (config.getString("position")) {
          "fullScreen" -> ConsentLayerUIConfig.Position.FULL_SCREEN
          "halfScreenBottom" -> ConsentLayerUIConfig.Position.HALF_SCREEN_BOTTOM
          "halfScreenTop" -> ConsentLayerUIConfig.Position.HALF_SCREEN_TOP
          else -> ConsentLayerUIConfig.Position.FULL_SCREEN
        }

        this.webViewConfig = ConsentLayerUIConfig(
          position = position,
          backgroundStyle = ConsentLayerUIConfig.BackgroundStyle.dimmed(android.graphics.Color.BLACK, 0.5f),
          cornerRadius = (config.getDouble("cornerRadius") ?: 0.0).toFloat(),
          respectsSafeArea = config.getBoolean("respectsSafeArea"),
          isCancelable = false,
          allowsOrientationChanges = config.getBoolean("allowsOrientationChanges")
        )

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to set WebView config: ${e.message}")
      }
    }
  }

  @ReactMethod
  override fun setUrlConfig(config: ReadableMap, promise: Promise) {
    runOnUiThread {
      try {
        val id = config.getString("id") ?: throw IllegalArgumentException("Missing 'id'")
        val domain = config.getString("domain") ?: throw IllegalArgumentException("Missing 'domain'")
        val language = config.getString("language") ?: throw IllegalArgumentException("Missing 'language'")
        val appName = config.getString("appName") ?: throw IllegalArgumentException("Missing 'appName'")
        val noHash = if (config.hasKey("noHash")) config.getBoolean("noHash") else false

        this.urlConfig = UrlConfig(id, domain, language, appName, noHash = noHash)

        initializeCMPManager()

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to set URL config: ${e.message}")
      }
    }
  }

  private fun initializeCMPManager() {
    val activity = currentActivity ?: throw IllegalStateException("Current activity is null")
    Log.d("CmSdkReactNativeV3", "Initializing CMPManager with activity: $activity, delegate: $this")

    cmpManager = CMPManager.getInstance(
      activity,
      urlConfig,
      webViewConfig,
      this
    )
    cmpManager.setActivity(activity)

    cmpManager.setOnClickLinkCallback { url ->
      Log.d("CmSdkReactNativeV3", "Link clicked: $url")
      val params = Arguments.createMap().apply {
        putString("url", url)
      }
      sendEvent("onClickLink", params)

      when {
        !url.contains("google.com") -> true
        url.contains("privacy") || url.contains("terms") -> true
        else -> false
      }
    }

    if (!isGloballyInitialized) {
      globalCMPManager = cmpManager
      isGloballyInitialized = true
    }
    isInitialized = true

    Log.d("CmSdkReactNativeV3", "CMPManager initialized with fresh delegate registration")
  }

  /**
   * Gets the comprehensive user consent status
   */
  @ReactMethod
  override fun getUserStatus(promise: Promise) {
    try {
      val userStatus = cmpManager.getUserStatus()
      val result = Arguments.createMap().apply {
        putString("hasUserChoice", userStatus.hasUserChoice.toString())
        putString("tcf", userStatus.tcf)
        putString("addtlConsent", userStatus.addtlConsent)
        putString("regulation", userStatus.regulation)

        val vendorsMap = Arguments.createMap()
        userStatus.vendors.forEach { (vendorId, status) ->
          vendorsMap.putString(vendorId, status.toString())
        }
        putMap("vendors", vendorsMap)

        val purposesMap = Arguments.createMap()
        userStatus.purposes.forEach { (purposeId, status) ->
          purposesMap.putString(purposeId, status.toString())
        }
        putMap("purposes", purposesMap)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get user status: ${e.message}", e)
    }
  }

  /**
   * Gets the consent status for a specific purpose
   */
  @ReactMethod
  override fun getStatusForPurpose(purposeId: String, promise: Promise) {
    try {
      val status = cmpManager.getStatusForPurpose(purposeId)
      promise.resolve(status.toString())
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get status for purpose: ${e.message}", e)
    }
  }

  /**
   * Gets the consent status for a specific vendor
   */
  @ReactMethod
  override fun getStatusForVendor(vendorId: String, promise: Promise) {
    try {
      val status = cmpManager.getStatusForVendor(vendorId)
      promise.resolve(status.toString())
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get status for vendor: ${e.message}", e)
    }
  }

  /**
   * Gets Google Consent Mode v2 compatible settings
   */
  @ReactMethod
  override fun getGoogleConsentModeStatus(promise: Promise) {
    try {
      val consentModeStatus = cmpManager.getGoogleConsentModeStatus()
      val result = Arguments.createMap()

      consentModeStatus.forEach { (key, value) ->
        result.putString(key, value)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get Google Consent Mode status: ${e.message}", e)
    }
  }

  /**
   * Replacement for openConsentLayer - force opens the consent UI
   */
  @ReactMethod
  override fun forceOpen(jumpToSettings: Boolean, promise: Promise) {
    scope.launch {
      try {
        currentActivity?.let { cmpManager.setActivity(it) }

        cmpManager.forceOpen(jumpToSettings) { result ->
          if (result.isSuccess) {
            promise.resolve(true)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to force open consent layer: ${e.message}", e)
      }
    }
  }

  /**
   * Replacement for checkWithServerAndOpenIfNecessary - checks with server and opens if needed
   */
  @ReactMethod
  override fun checkAndOpen(jumpToSettings: Boolean, promise: Promise) {
    scope.launch {
      try {
        currentActivity?.let { cmpManager.setActivity(it) }

        cmpManager.checkAndOpen(jumpToSettings) { result ->
          if (result.isSuccess) {
            promise.resolve(true)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to check and open consent: ${e.message}", e)
      }
    }
  }

  /**
   * Import a CMP information string
   */
  @ReactMethod
  override fun importCMPInfo(cmpString: String, promise: Promise) {
    scope.launch {
      try {
        cmpManager.importCMPInfo(cmpString) { result ->
          if (result.isSuccess) {
            promise.resolve(true)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to import CMP info: ${e.message}", e)
      }
    }
  }

  /**
   * Reset all consent management data
   */
  @ReactMethod
  override fun resetConsentManagementData(promise: Promise) {
    try {
      cmpManager.resetConsentManagementData()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to reset consent management data: ${e.message}", e)
    }
  }

  @ReactMethod
  override fun exportCMPInfo(promise: Promise) {
    promise.resolve(cmpManager.exportCMPInfo())
  }

  @ReactMethod
  override fun acceptVendors(vendors: ReadableArray, promise: Promise) {
    scope.launch {
      try {
        Log.d("CmSdkReactNativeV3", "Accepting vendors: $vendors")

        cmpManager.acceptVendors(vendors.toListOfStrings()) { result ->
          if (result.isSuccess) {
            promise.resolve(null)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to accept vendors: ${e.message}", e)
      }
    }
  }

  @ReactMethod
  override fun rejectVendors(vendors: ReadableArray, promise: Promise) {
    scope.launch {
      try {
        Log.d("CmSdkReactNativeV3", "Rejecting vendors: $vendors")
        cmpManager.rejectVendors(vendors.toListOfStrings()) { result ->
          if (result.isSuccess) {
            promise.resolve(null)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to reject vendors: ${e.message}", e)
      }
    }
  }

  @ReactMethod
  override fun acceptPurposes(purposes: ReadableArray, updatePurpose: Boolean, promise: Promise) {
    scope.launch {
      try {
        Log.d("Cmsdkreactnativev3", "Rejecting purposes: $purposes")

        cmpManager.acceptPurposes(purposes.toListOfStrings(), updatePurpose) { result ->
          if (result.isSuccess) {
            promise.resolve(null)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to accept purposes: ${e.message}", e)
      }
    }
  }

  @ReactMethod
  override fun rejectPurposes(purposes: ReadableArray, updateVendor: Boolean, promise: Promise) {
    scope.launch {
      try {
        Log.d("Cmsdkreactnativev3", "Rejecting purposes: $purposes")
        cmpManager.rejectPurposes(purposes.toListOfStrings(), updateVendor) { result ->
          if (result.isSuccess) {
            promise.resolve(null)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to reject purposes: ${e.message}", e)
      }
    }
  }

  @ReactMethod
  override fun rejectAll(promise: Promise) {
    scope.launch {
      try {
        cmpManager.rejectAll { result ->
          if (result.isSuccess) {
            promise.resolve(null)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to reject all: ${e.message}", e)
      }
    }
  }

  @ReactMethod
  override fun acceptAll(promise: Promise) {
    scope.launch {
      try {
        cmpManager.acceptAll { result ->
          if (result.isSuccess) {
            promise.resolve(null)
          } else {
            promise.reject("ERROR", result.exceptionOrNull()?.message ?: "Unknown error")
          }
        }
      } catch (e: Exception) {
        promise.reject("ERROR", "Failed to accept all: ${e.message}", e)
      }
    }
  }
  private fun ReadableArray.toListOfStrings(): List<String> {
    val list = mutableListOf<String>()
    for (i in 0 until this.size()) {
      when (this.getType(i)) {
        ReadableType.String -> list.add(this.getString(i) ?: "")
        ReadableType.Number -> list.add(this.getDouble(i).toString())
        ReadableType.Boolean -> list.add(this.getBoolean(i).toString())
        else -> throw IllegalArgumentException("Unsupported type in ReadableArray at index $i")
      }
    }
    return list
  }

  override fun onHostResume() {
    if (::cmpManager.isInitialized) {
      cmpManager.onApplicationResume()
      currentActivity?.let { cmpManager.setActivity(it) }
    }
  }

  override fun onHostPause() {
    if (::cmpManager.isInitialized) {
      cmpManager.onApplicationPause()
    }
  }

  override fun onHostDestroy() {
    if (::cmpManager.isInitialized) {
      cmpManager.onActivityDestroyed()
    }
  }

  private fun sendEvent(eventName: String, params: WritableMap?) {
    Log.d("CmSdkReactNativeV3", "sendEvent called: $eventName")
    // Bridgeless-compatible: emitDeviceEvent works in all modes (legacy, new arch, bridgeless)
    reactApplicationContext.emitDeviceEvent(eventName, params)
  }

  private fun List<String>.toWritableArray(): WritableArray {
    return Arguments.createArray().apply {
      this@toWritableArray.forEach { pushString(it) }
    }
  }

  companion object {
    const val NAME = "CmSdkReactNativeV3"
    private var globalCMPManager: CMPManager? = null
    private var isGloballyInitialized = false
  }

  override fun didReceiveConsent(consent: String, jsonObject: Map<String, Any>) {
    Log.d("CmSdkReactNativeV3", "didReceiveConsent called from native SDK with consent: ${consent.take(50)}...")
    val params = Arguments.createMap().apply {
      putString("consent", consent)
      putMap("jsonObject", convertMapToWritableMap(jsonObject))
    }
    sendEvent("didReceiveConsent", params)
  }

  private fun convertMapToWritableMap(map: Map<String, Any>): WritableMap {
    val writableMap = Arguments.createMap()
    map.forEach { (key, value) ->
      when (value) {
        is String -> writableMap.putString(key, value)
        is Int -> writableMap.putInt(key, value)
        is Long -> writableMap.putDouble(key, value.toDouble())
        is Double -> writableMap.putDouble(key, value)
        is Float -> writableMap.putDouble(key, value.toDouble())
        is Boolean -> writableMap.putBoolean(key, value)
        is Map<*, *> -> {
          @Suppress("UNCHECKED_CAST")
          writableMap.putMap(key, convertMapToWritableMap(value as Map<String, Any>))
        }
        is List<*> -> writableMap.putArray(key, convertListToWritableArray(value))
        else -> writableMap.putString(key, value.toString())
      }
    }
    return writableMap
  }

  private fun convertListToWritableArray(list: List<*>): WritableArray {
    val writableArray = Arguments.createArray()
    list.forEach { item ->
      when (item) {
        is String -> writableArray.pushString(item)
        is Int -> writableArray.pushInt(item)
        is Long -> writableArray.pushDouble(item.toDouble())
        is Double -> writableArray.pushDouble(item)
        is Float -> writableArray.pushDouble(item.toDouble())
        is Boolean -> writableArray.pushBoolean(item)
        is Map<*, *> -> {
          @Suppress("UNCHECKED_CAST")
          writableArray.pushMap(convertMapToWritableMap(item as Map<String, Any>))
        }
        is List<*> -> writableArray.pushArray(convertListToWritableArray(item))
        else -> writableArray.pushString(item.toString())
      }
    }
    return writableArray
  }

  override fun didShowConsentLayer() {
    Log.d("CmSdkReactNativeV3", "didShowConsentLayer called from native SDK - forwarding to React Native")
    sendEvent("didShowConsentLayer", null)
  }

  override fun didCloseConsentLayer() {
    Log.d("CmSdkReactNativeV3", "didCloseConsentLayer called from native SDK - forwarding to React Native")
    sendEvent("didCloseConsentLayer", null)
  }

  override fun didReceiveError(error: String) {
    val params = Arguments.createMap().apply {
      putString("error", error)
    }
    sendEvent("didReceiveError", params)
  }
}
