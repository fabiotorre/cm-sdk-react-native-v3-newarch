import Foundation
import UIKit
import WebKit
import cm_sdk_ios_v3
import React

// MARK: - Debug Logging

/// Set to `true` to enable debug logging during development.
/// Should be `false` for production builds.
private let kCMPDebugLoggingEnabled = false

private func CMPLog(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
  #if DEBUG
  if kCMPDebugLoggingEnabled {
    let filename = (file as NSString).lastPathComponent
    print("[CMP] \(filename):\(line) \(function): \(message)")
  }
  #endif
}

// MARK: - Implementation

@objc(CmSdkReactNativeV3Impl)
class CmSdkReactNativeV3Impl: NSObject, CMPManagerDelegate {
  private let cmpManager: CMPManager
  private weak var eventEmitter: RCTEventEmitter?
  private var hasListeners: Bool = false
  private var isConsentLayerShown: Bool = false
  private var shouldHandleLinkClicks: Bool = false
  
  @objc
  init(eventEmitter: RCTEventEmitter) {
    self.eventEmitter = eventEmitter
    self.cmpManager = CMPManager.shared
    super.init()
    self.cmpManager.delegate = self
    
    self.cmpManager.setLinkClickHandler { [weak self] url in
      let urlString = url.absoluteString
      
      guard let strongSelf = self, strongSelf.shouldHandleLinkClicks else {
        CMPLog("Allowing navigation during SDK initialization: \(urlString)")
        return false
      }
      
      CMPLog("Link clicked: \(urlString)")
      strongSelf.sendEvent(name: "onClickLink", body: ["url": urlString])
      
      if !urlString.contains("google.com") ||
         urlString.contains("privacy") ||
         urlString.contains("terms") {
        return true
      } else {
        return false
      }
    }
  }
  
  private func sendEvent(name: String, body: [String: Any]?) {
    eventEmitter?.sendEvent(withName: name, body: body)
  }
  
  /// Hops to the main thread without blocking the caller.
  ///
  /// TurboModule promise methods run on a serial queue that React Native shares
  /// across every Objective-C module, so a blocking hop here stalls this module
  /// and every other one behind it while the main thread is busy during launch.
  private func runOnMainThread(_ block: @escaping () -> Void) {
    if Thread.isMainThread {
        block()
    } else {
        DispatchQueue.main.async(execute: block)
    }
  }

  // MARK: - CMPManagerDelegate methods

  func didReceiveConsent(consent: String, jsonObject: [String: Any]) {
    sendEvent(name: "didReceiveConsent", body: [
      "consent": consent,
      "jsonObject": jsonObject
    ])
  }

  func didShowConsentLayer() {
    isConsentLayerShown = true
    shouldHandleLinkClicks = true
    sendEvent(name: "didShowConsentLayer", body: nil)
  }

  func didCloseConsentLayer() {
    if isConsentLayerShown {
      isConsentLayerShown = false
      shouldHandleLinkClicks = false
      sendEvent(name: "didCloseConsentLayer", body: nil)
    } else {
      CMPLog("Ignoring didCloseConsentLayer - consent layer was not shown")
    }
  }

  func didReceiveError(error: String) {
    sendEvent(name: "didReceiveError", body: ["error": error])
  }
  
  func didChangeATTStatus(oldStatus: Int, newStatus: Int, lastUpdated: Date?) {
    sendEvent(name: "didChangeATTStatus", body: [
      "oldStatus": oldStatus,
      "newStatus": newStatus,
      "lastUpdated": lastUpdated?.timeIntervalSince1970 ?? 0
    ])
  }

  // MARK: - Configuration methods

  @objc
  func setWebViewConfig(_ config: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let cornerRadius = CGFloat(config["cornerRadius"] as? Double ?? 5)
    let respectsSafeArea = config["respectsSafeArea"] as? Bool ?? true
    let allowsOrientationChanges = config["allowsOrientationChanges"] as? Bool ?? true
    let darkMode = config["darkMode"] as? Bool ?? false

    // mapPosition and mapBackgroundStyle read UIKit (screen bounds, safe area
    // insets, colors), so they have to run on the main thread.
    runOnMainThread { [self] in
      let uiConfig = ConsentLayerUIConfig(
        position: mapPosition(config: config, respectsSafeArea: respectsSafeArea),
        backgroundStyle: mapBackgroundStyle(config: config),
        cornerRadius: cornerRadius,
        respectsSafeArea: respectsSafeArea,
        allowsOrientationChanges: allowsOrientationChanges,
        darkMode: darkMode
      )

      cmpManager.setWebViewConfig(uiConfig)
      resolve(nil)
    }
  }

  @objc
  func setUrlConfig(_ config: [String: Any], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    runOnMainThread { [self] in
          do {
        guard let id = config["id"] as? String,
              let domain = config["domain"] as? String,
              let language = config["language"] as? String,
              let appName = config["appName"] as? String else {
          throw NSError(domain: "CmSdkReactNativeV3", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid config parameters"])
        }
        let jsonConfig = config["jsonConfig"] as? String
        let noHash = config["noHash"] as? Bool ?? false
        let webViewConnectionTimeoutMillis = (config["webViewConnectionTimeoutMillis"] as? NSNumber)?.intValue ?? 3000
        let forceRegulation = config["forceRegulation"] as? String
        CMPLog("Setting URL config - ID: \(id), Domain: \(domain)")

        let urlConfig = UrlConfig(
          id: id,
          domain: domain,
          language: language,
          appName: appName,
          jsonConfig: jsonConfig,
          noHash: noHash,
          webViewConnectionTimeoutMillis: webViewConnectionTimeoutMillis,
          forceRegulation: forceRegulation
        )
        CMPLog("URL config created: \(urlConfig)")
        self.cmpManager.setUrlConfig(urlConfig)
        resolve(nil)
          } catch {
              reject("ERROR", "Failed to set URL config: \(error.localizedDescription)", error)
          }
      }
  }

  @objc
  func setATTStatus(_ status: NSInteger, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      cmpManager.setATTStatus(Int(status))
      resolve(nil)
  }

  @objc
  func getUserStatus(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let status = cmpManager.getUserStatus()
      let normalizedStatus = normalizeUserChoiceStatus(status.status)
      let response: [String: Any] = [
          "status": normalizedStatus,
          "hasUserChoice": normalizedStatus,
          "vendors": normalizeStatusMap(status.vendors),
          "purposes": normalizeStatusMap(status.purposes),
          "tcf": status.tcf,
          "addtlConsent": status.addtlConsent,
          "regulation": status.regulation
      ]
      resolve(response)
  }

  @objc
  func isConsentRequired(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    cmpManager.isConsentRequired { isRequired, error in
      if let error = error {
        reject("ERROR", "Failed to check if consent is required: \(error.localizedDescription)", error)
      } else {
        resolve(isRequired)
      }
    }
  }

  @objc
  func getStatusForPurpose(_ purposeId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let status = cmpManager.getStatusForPurpose(id: purposeId)
      resolve(stringValue(for: status))
  }

  @objc
  func getStatusForVendor(_ vendorId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let status = cmpManager.getStatusForVendor(id: vendorId)
      resolve(stringValue(for: status))
  }

  @objc
  func getGoogleConsentModeStatus(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let status = cmpManager.getGoogleConsentModeStatus()
      resolve(status)
  }

  @objc
  func checkAndOpen(_ jumpToSettings: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      runOnMainThread {
        self.updatePresentingViewControllerIfNeeded()
        self.cmpManager.checkAndOpen(jumpToSettings: jumpToSettings) { error in
            if let error = error {
                reject("ERROR", "Failed to check and open: \(error.localizedDescription)", error)
            } else {
                resolve(true)
            }
        }
      }
  }

  @objc
  func forceOpen(_ jumpToSettings: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      runOnMainThread {
        self.updatePresentingViewControllerIfNeeded()
        self.cmpManager.forceOpen(jumpToSettings: jumpToSettings) { error in
            if let error = error {
                reject("ERROR", "Failed to force open: \(error.localizedDescription)", error)
            } else {
                resolve(true)
            }
        }
      }
  }

  @objc
  func exportCMPInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let info = self.cmpManager.exportCMPInfo()
      resolve(info)
  }

  @objc
  func acceptVendors(_ vendors: [String], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.acceptVendors(vendors) { error in
        self.resolveBooleanCompletion(error: error, failurePrefix: "Failed to accept vendors", resolve: resolve, reject: reject)
      }
  }

  @objc
  func rejectVendors(_ vendors: [String], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.rejectVendors(vendors) { error in
        self.resolveBooleanCompletion(error: error, failurePrefix: "Failed to reject vendors", resolve: resolve, reject: reject)
      }
  }

  @objc
  func acceptPurposes(_ purposes: [String], updatePurpose: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.acceptPurposes(purposes, updatePurpose: updatePurpose) { error in
        self.resolveBooleanCompletion(error: error, failurePrefix: "Failed to accept purposes", resolve: resolve, reject: reject)
      }
  }

  @objc
  func rejectPurposes(_ purposes: [String], updateVendor: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.rejectPurposes(purposes, updateVendor: updateVendor) { error in
        self.resolveBooleanCompletion(error: error, failurePrefix: "Failed to reject purposes", resolve: resolve, reject: reject)
      }
  }

  @objc
  func rejectAll(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    self.cmpManager.rejectAll { error in
       if let error = error {
           reject("ERROR", "Failed to reject all: \(error.localizedDescription)", error)
       } else {
           resolve(true)
       }
     }
  }

  @objc
  func acceptAll(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    self.cmpManager.acceptAll { error in
      if let error = error {
         reject("ERROR", "Failed to accept all: \(error.localizedDescription)", error)
      } else {
         resolve(true)
      }
    }
  }

  @objc
  func importCMPInfo(_ cmpString: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.importCMPInfo(cmpString) { error in
         if let error = error {
             reject("ERROR", "Failed to import CMP info: \(error.localizedDescription)", error)
         } else {
             resolve(true)
         }
     }
  }

  @objc
  func resetConsentManagementData(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.resetConsentManagementData { error in
        if let error = error {
          reject("ERROR", "Failed to reset consent management data: \(error.localizedDescription)", error)
          return
        }

        self.clearWebViewData {
          resolve(true)
        }
      }
  }

  @objc
  func setAutomaticConsentUpdatesEnabled(_ enabled: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    reject("ERROR", "setAutomaticConsentUpdatesEnabled is only available on Android.", nil)
  }

  @objc
  func updateThirdPartyConsent(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    reject("ERROR", "updateThirdPartyConsent is only available on Android.", nil)
  }

  @objc
  func configureAutomaticFirebaseConsentUpdates(_ enabled: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    CMPManager.configureAutomaticFirebaseConsentUpdates(enabled)
    resolve(nil)
  }

  @objc
  func setAutomaticFirebaseConsentUpdatesEnabled(_ enabled: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    cmpManager.setAutomaticFirebaseConsentUpdatesEnabled(enabled)
    resolve(nil)
  }

  @objc
  func isAutomaticFirebaseConsentUpdatesEnabled(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(cmpManager.isAutomaticFirebaseConsentUpdatesEnabled())
  }

  @objc
  func updateFirebaseConsent(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(cmpManager.updateFirebaseConsent())
  }

  @objc
  func isFirebaseAnalyticsAvailable(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    resolve(cmpManager.isFirebaseAnalyticsAvailable())
  }

  // MARK: - Helpers

  private func mapPosition(config: [String: Any], respectsSafeArea: Bool) -> Position {
    if let positionValue = config["position"] as? String, positionValue == "custom",
       let rectValue = config["customRect"] as? [String: Any],
       let rect = rectFromDictionary(rectValue, respectsSafeArea: respectsSafeArea) {
      return .custom(rect)
    }

    let insets = currentSafeAreaInsets()
    let screenBounds = UIScreen.main.bounds
    let usableHeight = screenBounds.height - (respectsSafeArea ? (insets.top + insets.bottom) : 0)
    let halfHeight = usableHeight / 2

    guard let positionValue = config["position"] as? String else {
      return .fullScreen
    }

    switch positionValue {
    case "halfScreenTop":
      let originY = respectsSafeArea ? insets.top : 0
      return .custom(CGRect(x: 0, y: originY, width: screenBounds.width, height: halfHeight))
    case "halfScreenBottom":
      let originY = (respectsSafeArea ? insets.top : 0) + halfHeight
      return .custom(CGRect(x: 0, y: originY, width: screenBounds.width, height: halfHeight))
    default:
      return .fullScreen
    }
  }

  private func mapBackgroundStyle(config: [String: Any]) -> BackgroundStyle {
    guard let backgroundConfig = config["backgroundStyle"] as? [String: Any],
          let type = backgroundConfig["type"] as? String else {
      return .dimmed(.black, 0.5)
    }

    switch type {
    case "dimmed":
      let colorInput = backgroundConfig["color"] ?? "black"
      let color = RCTConvert.uiColor(colorInput) ?? .black
      let opacity = CGFloat(backgroundConfig["opacity"] as? Double ?? 0.5)
      return .dimmed(color, opacity)
    case "color":
      let colorInput = backgroundConfig["color"] ?? "black"
      let color = RCTConvert.uiColor(colorInput) ?? .black
      return .color(color)
    case "blur":
      let styleString = backgroundConfig["blurEffectStyle"] as? String ?? "dark"
      let blurStyle: UIBlurEffect.Style
      switch styleString {
      case "extraLight": blurStyle = .extraLight
      case "light": blurStyle = .light
      default: blurStyle = .dark
      }
      return .blur(blurStyle)
    case "none":
      return .none
    default:
      return .dimmed(.black, 0.5)
    }
  }

  private func rectFromDictionary(_ dict: [String: Any], respectsSafeArea: Bool) -> CGRect? {
    guard
      let x = dict["x"] as? Double,
      let y = dict["y"] as? Double,
      let width = dict["width"] as? Double,
      let height = dict["height"] as? Double
    else {
      return nil
    }

    let insets = respectsSafeArea ? currentSafeAreaInsets() : .zero
    return CGRect(
      x: CGFloat(x) + insets.left,
      y: CGFloat(y) + insets.top,
      width: CGFloat(width) - (insets.left + insets.right),
      height: CGFloat(height) - (insets.top + insets.bottom)
    )
  }

  private func currentSafeAreaInsets() -> UIEdgeInsets {
    var insets: UIEdgeInsets = .zero
    let work = {
      if #available(iOS 13.0, *) {
        let windowScene = UIApplication.shared.connectedScenes
          .compactMap { $0 as? UIWindowScene }
          .first { $0.activationState == .foregroundActive }
        let window = windowScene?.windows.first { $0.isKeyWindow }
        insets = window?.safeAreaInsets ?? .zero
      } else {
        insets = UIApplication.shared.keyWindow?.safeAreaInsets ?? .zero
      }
    }

    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.sync { work() }
    }

    return insets
  }

  private func stringValue(for status: UniqueConsentStatus) -> String {
    switch status {
    case .choiceDoesntExist:
      return "choiceDoesntExist"
    case .granted:
      return "granted"
    case .denied:
      return "denied"
    @unknown default:
      return "choiceDoesntExist"
    }
  }

  private func normalizeUserChoiceStatus(_ status: String) -> String {
    switch status.lowercased() {
    case "choiceexists":
      return "choiceExists"
    case "choicedoesntexist":
      return "choiceDoesntExist"
    default:
      return status
    }
  }

  private func normalizeStatusMap(_ statuses: [String: String]) -> [String: String] {
    var normalized: [String: String] = [:]
    statuses.forEach { key, value in
      normalized[key] = normalizeConsentStatus(value)
    }
    return normalized
  }

  private func normalizeConsentStatus(_ status: String) -> String {
    switch status.lowercased() {
    case "granted":
      return "granted"
    case "denied":
      return "denied"
    case "choicedoesntexist":
      return "choiceDoesntExist"
    default:
      return status
    }
  }

  private func resolveBooleanCompletion(
    error: NSError?,
    failurePrefix: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if let error = error {
      reject("ERROR", "\(failurePrefix): \(error.localizedDescription)", error)
    } else {
      resolve(true)
    }
  }

  private func updatePresentingViewControllerIfNeeded() {
    if let viewController = currentPresentingViewController() {
      cmpManager.setPresentingViewController(viewController)
    }
  }

  private func currentPresentingViewController() -> UIViewController? {
    if #available(iOS 13.0, *) {
      let windowScene = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .first { $0.activationState == .foregroundActive }
      let rootViewController = windowScene?.windows.first { $0.isKeyWindow }?.rootViewController
      return topMostViewController(from: rootViewController)
    }

    return topMostViewController(from: UIApplication.shared.keyWindow?.rootViewController)
  }

  private func topMostViewController(from rootViewController: UIViewController?) -> UIViewController? {
    var current = rootViewController
    while let presented = current?.presentedViewController {
      current = presented
    }
    return current
  }

  private func clearWebViewData(completion: @escaping () -> Void) {
    let dataStore = WKWebsiteDataStore.default()
    let types = WKWebsiteDataStore.allWebsiteDataTypes()
    let domainsToClear = [
      "consentmanager.net",
      "delivery.consentmanager.net",
      "a.delivery.consentmanager.net"
    ]

    DispatchQueue.main.async {
      dataStore.fetchDataRecords(ofTypes: types) { records in
        let toDelete = records.filter { record in
          domainsToClear.contains { domain in
            record.displayName.contains(domain)
          }
        }

        let deleteAndComplete = {
          self.clearCookiesForDomains(domainsToClear)
          completion()
        }

        guard !toDelete.isEmpty else {
          deleteAndComplete()
          return
        }

        dataStore.removeData(ofTypes: types, for: toDelete) {
          deleteAndComplete()
        }
      }
    }
  }

  private func clearCookiesForDomains(_ domains: [String]) {
    let cookieStorage = HTTPCookieStorage.shared
    cookieStorage.cookies?.forEach { cookie in
      if domains.contains(where: { domain in cookie.domain.contains(domain) }) {
        cookieStorage.deleteCookie(cookie)
      }
    }
  }
}
