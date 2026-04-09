package com.cmsdkreactnativev3

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.CookieManager
import android.webkit.WebStorage
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
import net.consentmanager.cm_sdk_android_v3.UserChoiceStatus

/**
 * Debug logging helper - only logs in debug builds
 */
private fun logDebug(message: String) {
  if (BuildConfig.DEBUG) {
    Log.d(CmSdkReactNativeV3Module.TAG, message)
  }
}

private fun logWarning(message: String) {
  Log.w(CmSdkReactNativeV3Module.TAG, message)
}

/**
 * Error codes for promise rejections
 */
private object ErrorCodes {
  const val CONFIG_ERROR = "E_CONFIG_ERROR"
  const val CONSENT_ERROR = "E_CONSENT_ERROR"
  const val INIT_ERROR = "E_INIT_ERROR"
  const val STATUS_ERROR = "E_STATUS_ERROR"
  const val IMPORT_ERROR = "E_IMPORT_ERROR"
}

class CmSdkReactNativeV3Module(reactContext: ReactApplicationContext) :
  NativeCmSdkReactNativeV3Spec(reactContext), LifecycleEventListener, CMPManagerDelegate {

  private lateinit var cmpManager: CMPManager
  private val scope = CoroutineScope(Dispatchers.Main)
  private var urlConfig: UrlConfig
  private var webViewConfig: ConsentLayerUIConfig
  private val uiThreadHandler = Handler(Looper.getMainLooper())


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
    promise.resolve(null)
  }

  @ReactMethod
  override fun setWebViewConfig(config: ReadableMap, promise: Promise) {
    runOnUiThread {
      try {
        val position = when (config.getString("position")) {
          "fullScreen" -> ConsentLayerUIConfig.Position.FULL_SCREEN
          "halfScreenBottom" -> ConsentLayerUIConfig.Position.HALF_SCREEN_BOTTOM
          "halfScreenTop" -> ConsentLayerUIConfig.Position.HALF_SCREEN_TOP
          "custom" -> {
            logWarning("Android SDK ignores custom position/customRect; falling back to fullScreen.")
            ConsentLayerUIConfig.Position.FULL_SCREEN
          }
          else -> ConsentLayerUIConfig.Position.FULL_SCREEN
        }

        val cornerRadiusDp = if (config.hasKey("cornerRadius")) config.getDouble("cornerRadius").toFloat() else 5f
        val cornerRadius = dpToPx(cornerRadiusDp)

        this.webViewConfig = ConsentLayerUIConfig(
          position = position,
          backgroundStyle = mapBackgroundStyle(config),
          cornerRadius = cornerRadius,
          respectsSafeArea = if (config.hasKey("respectsSafeArea")) config.getBoolean("respectsSafeArea") else true,
          isCancelable = false,
          allowsOrientationChanges = if (config.hasKey("allowsOrientationChanges")) config.getBoolean("allowsOrientationChanges") else true,
          darkMode = if (config.hasKey("darkMode")) config.getBoolean("darkMode") else false,
          navigationBarColor = readOptionalColor(config, "navigationBarColor")
        )

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject(ErrorCodes.CONFIG_ERROR, "Failed to set WebView config: ${e.message}")
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
        val jsonConfig = if (config.hasKey("jsonConfig")) config.getString("jsonConfig") else null
        val noHash = if (config.hasKey("noHash")) config.getBoolean("noHash") else false
        val webViewConnectionTimeoutMillis =
          if (config.hasKey("webViewConnectionTimeoutMillis")) config.getDouble("webViewConnectionTimeoutMillis").toLong() else 3000L
        val forceRegulation = if (config.hasKey("forceRegulation")) config.getString("forceRegulation") else null

        this.urlConfig = UrlConfig(
          id = id,
          domain = domain,
          language = language,
          appName = appName,
          jsonConfig = jsonConfig,
          noHash = noHash,
          webViewConnectionTimeoutMillis = webViewConnectionTimeoutMillis,
          forceRegulation = forceRegulation
        )

        initializeCMPManager()

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject(ErrorCodes.CONFIG_ERROR, "Failed to set URL config: ${e.message}")
      }
    }
  }

  private fun initializeCMPManager() {
    val activity = currentActivitySafe ?: throw IllegalStateException("Current activity is null. Wait until the app is active before calling setUrlConfig().")
    logDebug("Initializing CMPManager with activity: $activity")

    cmpManager = CMPManager.getInstance(
      activity,
      urlConfig,
      webViewConfig,
      this
    )
    cmpManager.setActivity(activity)

    cmpManager.setOnClickLinkCallback { url ->
      logDebug("Link clicked: $url")
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

    logDebug("CMPManager initialized successfully")
  }

  /**
   * Gets the comprehensive user consent status
   */
  @ReactMethod
  override fun getUserStatus(promise: Promise) {
    withCmpManager(promise) { manager ->
      try {
        val userStatus = manager.getUserStatus()
        val normalizedStatus = mapUserChoiceStatus(userStatus.hasUserChoice)
        val result = Arguments.createMap().apply {
          putString("status", normalizedStatus)
          putString("hasUserChoice", normalizedStatus)
          putString("tcf", userStatus.tcf)
          putString("addtlConsent", userStatus.addtlConsent)
          putString("regulation", userStatus.regulation)

          val vendorsMap = Arguments.createMap()
          userStatus.vendors.forEach { (vendorId, status) ->
            vendorsMap.putString(vendorId, mapConsentStatus(status))
          }
          putMap("vendors", vendorsMap)

          val purposesMap = Arguments.createMap()
          userStatus.purposes.forEach { (purposeId, status) ->
            purposesMap.putString(purposeId, mapConsentStatus(status))
          }
          putMap("purposes", purposesMap)
        }

        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject(ErrorCodes.STATUS_ERROR, "Failed to get user status: ${e.message}", e)
      }
    }
  }

  /**
   * Checks if consent is required without opening the consent UI
   */
  @ReactMethod
  override fun isConsentRequired(promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        val activity = currentActivitySafe ?: run {
          promise.reject(ErrorCodes.INIT_ERROR, "Current activity is null. Wait until the app is active before calling isConsentRequired().")
          return@withCmpManager
        }

        try {
          manager.setActivity(activity)
          manager.isConsentRequired { result ->
            if (result.isSuccess) {
              promise.resolve(result.getOrNull() ?: false)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to check if consent is required: ${e.message}", e)
        }
      }
    }
  }

  private fun dpToPx(dp: Float): Float {
    val metrics = reactApplicationContext.resources.displayMetrics
    return android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_DIP, dp, metrics)
  }

  /**
   * Gets the consent status for a specific purpose
   */
  @ReactMethod
  override fun getStatusForPurpose(purposeId: String, promise: Promise) {
    withCmpManager(promise) { manager ->
      try {
        val status = manager.getStatusForPurpose(purposeId)
        promise.resolve(mapConsentStatus(status))
      } catch (e: Exception) {
        promise.reject(ErrorCodes.STATUS_ERROR, "Failed to get status for purpose: ${e.message}", e)
      }
    }
  }

  /**
   * Gets the consent status for a specific vendor
   */
  @ReactMethod
  override fun getStatusForVendor(vendorId: String, promise: Promise) {
    withCmpManager(promise) { manager ->
      try {
        val status = manager.getStatusForVendor(vendorId)
        promise.resolve(mapConsentStatus(status))
      } catch (e: Exception) {
        promise.reject(ErrorCodes.STATUS_ERROR, "Failed to get status for vendor: ${e.message}", e)
      }
    }
  }

  /**
   * Gets Google Consent Mode v2 compatible settings
   */
  @ReactMethod
  override fun getGoogleConsentModeStatus(promise: Promise) {
    withCmpManager(promise) { manager ->
      try {
        val consentModeStatus = manager.getGoogleConsentModeStatus()
        val result = Arguments.createMap()

        consentModeStatus.forEach { (key, value) ->
          result.putString(key, value)
        }

        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject(ErrorCodes.STATUS_ERROR, "Failed to get Google Consent Mode status: ${e.message}", e)
      }
    }
  }

  /**
   * Replacement for openConsentLayer - force opens the consent UI
   */
  @ReactMethod
  override fun forceOpen(jumpToSettings: Boolean, promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        val activity = currentActivitySafe ?: run {
          promise.reject(ErrorCodes.INIT_ERROR, "Current activity is null. Wait until the app is active before calling forceOpen().")
          return@withCmpManager
        }

        try {
          manager.setActivity(activity)
          manager.forceOpen(jumpToSettings) { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to force open consent layer: ${e.message}", e)
        }
      }
    }
  }

  /**
   * Replacement for checkWithServerAndOpenIfNecessary - checks with server and opens if needed
   */
  @ReactMethod
  override fun checkAndOpen(jumpToSettings: Boolean, promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        val activity = currentActivitySafe ?: run {
          promise.reject(ErrorCodes.INIT_ERROR, "Current activity is null. Wait until the app is active before calling checkAndOpen().")
          return@withCmpManager
        }

        try {
          manager.setActivity(activity)
          manager.checkAndOpen(jumpToSettings) { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to check and open consent: ${e.message}", e)
        }
      }
    }
  }

  /**
   * Import a CMP information string
   */
  @ReactMethod
  override fun importCMPInfo(cmpString: String, promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        try {
          manager.importCMPInfo(cmpString) { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.IMPORT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.IMPORT_ERROR, "Failed to import CMP info: ${e.message}", e)
        }
      }
    }
  }

  /**
   * Reset all consent management data
   */
  @ReactMethod
  override fun resetConsentManagementData(promise: Promise) {
    withCmpManager(promise) { manager ->
      runOnUiThread {
        try {
          manager.resetConsentManagementData()
          clearWebViewStorage {
            promise.resolve(true)
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to reset consent management data: ${e.message}", e)
        }
      }
    }
  }

  @ReactMethod
  override fun exportCMPInfo(promise: Promise) {
    withCmpManager(promise) { manager ->
      promise.resolve(manager.exportCMPInfo())
    }
  }

  @ReactMethod
  override fun acceptVendors(vendors: ReadableArray, promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        try {
          logDebug("Accepting vendors: $vendors")
          manager.acceptVendors(vendors.toListOfStrings()) { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to accept vendors: ${e.message}", e)
        }
      }
    }
  }

  @ReactMethod
  override fun rejectVendors(vendors: ReadableArray, promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        try {
          logDebug("Rejecting vendors: $vendors")
          manager.rejectVendors(vendors.toListOfStrings()) { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to reject vendors: ${e.message}", e)
        }
      }
    }
  }

  @ReactMethod
  override fun acceptPurposes(purposes: ReadableArray, updatePurpose: Boolean, promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        try {
          logDebug("Accepting purposes: $purposes")
          manager.acceptPurposes(purposes.toListOfStrings(), updatePurpose) { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to accept purposes: ${e.message}", e)
        }
      }
    }
  }

  @ReactMethod
  override fun rejectPurposes(purposes: ReadableArray, updateVendor: Boolean, promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        try {
          logDebug("Rejecting purposes: $purposes")
          manager.rejectPurposes(purposes.toListOfStrings(), updateVendor) { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to reject purposes: ${e.message}", e)
        }
      }
    }
  }

  @ReactMethod
  override fun rejectAll(promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        try {
          manager.rejectAll { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to reject all: ${e.message}", e)
        }
      }
    }
  }

  @ReactMethod
  override fun acceptAll(promise: Promise) {
    scope.launch {
      withCmpManager(promise) { manager ->
        try {
          manager.acceptAll { result ->
            if (result.isSuccess) {
              promise.resolve(true)
            } else {
              promise.reject(ErrorCodes.CONSENT_ERROR, result.exceptionOrNull()?.message ?: "Unknown error")
            }
          }
        } catch (e: Exception) {
          promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to accept all: ${e.message}", e)
        }
      }
    }
  }

  @ReactMethod
  override fun setAutomaticConsentUpdatesEnabled(enabled: Boolean, promise: Promise) {
    withCmpManager(promise) { manager ->
      try {
        manager.setAutomaticConsentUpdatesEnabled(enabled)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to set automatic consent updates: ${e.message}", e)
      }
    }
  }

  @ReactMethod
  override fun updateThirdPartyConsent(promise: Promise) {
    withCmpManager(promise) { manager ->
      try {
        val result = Arguments.createMap()
        manager.updateThirdPartyConsent(reactApplicationContext).forEach { (key, value) ->
          result.putBoolean(key, value)
        }
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject(ErrorCodes.CONSENT_ERROR, "Failed to update third-party consent: ${e.message}", e)
      }
    }
  }

  @ReactMethod
  override fun configureAutomaticFirebaseConsentUpdates(enabled: Boolean, promise: Promise) {
    promise.reject(ErrorCodes.CONFIG_ERROR, "configureAutomaticFirebaseConsentUpdates is only available on iOS.")
  }

  @ReactMethod
  override fun setAutomaticFirebaseConsentUpdatesEnabled(enabled: Boolean, promise: Promise) {
    promise.reject(ErrorCodes.CONFIG_ERROR, "setAutomaticFirebaseConsentUpdatesEnabled is only available on iOS.")
  }

  @ReactMethod
  override fun isAutomaticFirebaseConsentUpdatesEnabled(promise: Promise) {
    promise.reject(ErrorCodes.CONFIG_ERROR, "isAutomaticFirebaseConsentUpdatesEnabled is only available on iOS.")
  }

  @ReactMethod
  override fun updateFirebaseConsent(promise: Promise) {
    promise.reject(ErrorCodes.CONFIG_ERROR, "updateFirebaseConsent is only available on iOS.")
  }

  @ReactMethod
  override fun isFirebaseAnalyticsAvailable(promise: Promise) {
    promise.reject(ErrorCodes.CONFIG_ERROR, "isFirebaseAnalyticsAvailable is only available on iOS.")
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
      currentActivitySafe?.let { cmpManager.setActivity(it) }
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

  private val currentActivitySafe: Activity?
    get() = reactApplicationContext.currentActivity

  private fun sendEvent(eventName: String, params: WritableMap?) {
    logDebug("sendEvent: $eventName")
    // Bridgeless-compatible: emitDeviceEvent works in all modes (legacy, new arch, bridgeless)
    reactApplicationContext.emitDeviceEvent(eventName, params)
  }

  private fun mapBackgroundStyle(config: ReadableMap): ConsentLayerUIConfig.BackgroundStyle {
    val backgroundConfig = if (config.hasKey("backgroundStyle") && !config.isNull("backgroundStyle")) config.getMap("backgroundStyle") else null
    val type = backgroundConfig?.getString("type")

    return when (type) {
      "dimmed" -> ConsentLayerUIConfig.BackgroundStyle.dimmed(
        readOptionalColor(backgroundConfig, "color") ?: android.graphics.Color.BLACK,
        if (backgroundConfig.hasKey("opacity")) backgroundConfig.getDouble("opacity").toFloat() else 0.5f
      )
      "color" -> ConsentLayerUIConfig.BackgroundStyle.solid(
        readOptionalColor(backgroundConfig, "color") ?: android.graphics.Color.BLACK
      )
      "blur" -> ConsentLayerUIConfig.BackgroundStyle.blur(
        readOptionalColor(backgroundConfig, "fallbackColor") ?: android.graphics.Color.BLACK,
        if (backgroundConfig.hasKey("fallbackOpacity")) backgroundConfig.getDouble("fallbackOpacity").toFloat() else 0.5f
      )
      "none" -> ConsentLayerUIConfig.BackgroundStyle.none()
      else -> ConsentLayerUIConfig.BackgroundStyle.dimmed(android.graphics.Color.BLACK, 0.5f)
    }
  }

  private fun readOptionalColor(config: ReadableMap?, key: String): Int? {
    if (config == null || !config.hasKey(key) || config.isNull(key)) {
      return null
    }

    return when (config.getType(key)) {
      ReadableType.Number -> config.getDouble(key).toInt()
      ReadableType.String -> parseColorString(config.getString(key))
      else -> throw IllegalArgumentException("Unsupported color value type for $key")
    }
  }

  private fun parseColorString(color: String?): Int {
    val value = color?.trim()?.lowercase()
      ?: throw IllegalArgumentException("Color value cannot be null")

    return when (value) {
      "black" -> android.graphics.Color.BLACK
      "white" -> android.graphics.Color.WHITE
      "red" -> android.graphics.Color.RED
      "green" -> android.graphics.Color.GREEN
      "blue" -> android.graphics.Color.BLUE
      "yellow" -> android.graphics.Color.YELLOW
      "cyan" -> android.graphics.Color.CYAN
      "magenta" -> android.graphics.Color.MAGENTA
      "gray", "grey" -> android.graphics.Color.GRAY
      "darkgray", "darkgrey" -> android.graphics.Color.DKGRAY
      "lightgray", "lightgrey" -> android.graphics.Color.LTGRAY
      "transparent" -> android.graphics.Color.TRANSPARENT
      else -> android.graphics.Color.parseColor(color)
    }
  }

  private fun mapConsentStatus(status: ConsentStatus): String {
    return when (status) {
      ConsentStatus.CHOICE_DOESNT_EXIST -> "choiceDoesntExist"
      ConsentStatus.GRANTED -> "granted"
      ConsentStatus.DENIED -> "denied"
    }
  }

  private fun mapUserChoiceStatus(status: UserChoiceStatus): String {
    return when (status) {
      UserChoiceStatus.CHOICE_EXISTS -> "choiceExists"
      UserChoiceStatus.CHOICE_DOESNT_EXIST -> "choiceDoesntExist"
    }
  }

  private fun withCmpManager(promise: Promise, block: (CMPManager) -> Unit) {
    if (!::cmpManager.isInitialized) {
      promise.reject(ErrorCodes.INIT_ERROR, "CMPManager is not initialized. Call setUrlConfig() first.")
      return
    }

    block(cmpManager)
  }

  private fun clearWebViewStorage(onComplete: () -> Unit) {
    try {
      val cookieManager = CookieManager.getInstance()
      cookieManager.removeAllCookies {
        cookieManager.flush()
        WebStorage.getInstance().deleteAllData()
        onComplete()
      }
    } catch (e: Exception) {
      logWarning("Failed to clear WebView storage: ${e.message}")
      onComplete()
    }
  }

  companion object {
    const val NAME = "CmSdkReactNativeV3"
    const val TAG = "CmSdkReactNativeV3"
  }

  override fun didReceiveConsent(consent: String, jsonObject: Map<String, Any>) {
    logDebug("didReceiveConsent: ${consent.take(50)}...")
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
    logDebug("didShowConsentLayer")
    sendEvent("didShowConsentLayer", null)
  }

  override fun didCloseConsentLayer() {
    logDebug("didCloseConsentLayer")
    sendEvent("didCloseConsentLayer", null)
  }

  override fun didReceiveError(error: String) {
    val params = Arguments.createMap().apply {
      putString("error", error)
    }
    sendEvent("didReceiveError", params)
  }
}
