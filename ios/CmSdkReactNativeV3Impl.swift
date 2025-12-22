import Foundation
import UIKit
import cm_sdk_ios_v3
import React

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
        print("CmSdkReactNativeV3: Allowing navigation during SDK initialization: \(urlString)")
        return false
      }
      
      print("CmSdkReactNativeV3: Link clicked: \(urlString)")
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
  
  private func runOnMainThread(_ block: @escaping () -> Void) {
    if Thread.isMainThread {
        block()
    } else {
        DispatchQueue.main.sync(execute: block)
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
      print("CmSdkReactNativeV3: Ignoring didCloseConsentLayer - consent layer was not shown")
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

    let position = self.mapPosition(config: config, respectsSafeArea: respectsSafeArea)
    let backgroundStyle = self.mapBackgroundStyle(config: config)

    let uiConfig = ConsentLayerUIConfig(
      position: position,
      backgroundStyle: backgroundStyle,
      cornerRadius: cornerRadius,
      respectsSafeArea: respectsSafeArea,
      allowsOrientationChanges: allowsOrientationChanges
    )

    runOnMainThread{
      self.cmpManager.setWebViewConfig(uiConfig)
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
        let noHash = config["noHash"] as? Bool ?? false
        print("ID: \(id) - Domain: \(domain)")

        let urlConfig = UrlConfig(id: id, domain: domain, language: language, appName: appName, jsonConfig: nil, noHash: noHash)
        print("urlConfig = \(urlConfig)")
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
      let response: [String: Any] = [
          "status": status.status,
          "vendors": status.vendors,
          "purposes": status.purposes,
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
      resolve(status.rawValue)
  }

  @objc
  func getStatusForVendor(_ vendorId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let status = cmpManager.getStatusForVendor(id: vendorId)
      resolve(status.rawValue)
  }

  @objc
  func getGoogleConsentModeStatus(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let status = cmpManager.getGoogleConsentModeStatus()
      resolve(status)
  }

  @objc
  func checkAndOpen(_ jumpToSettings: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      cmpManager.checkAndOpen(jumpToSettings: jumpToSettings) { error in
          if let error = error {
              reject("ERROR", "Failed to check and open: \(error.localizedDescription)", error)
          } else {
              resolve(true)
          }
      }
  }

  @objc
  func forceOpen(_ jumpToSettings: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      cmpManager.forceOpen(jumpToSettings: jumpToSettings) { error in
          if let error = error {
              reject("ERROR", "Failed to force open: \(error.localizedDescription)", error)
          } else {
              resolve(true)
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
      self.cmpManager.acceptVendors(vendors) { success in
          resolve(success)
          }
  }

  @objc
  func rejectVendors(_ vendors: [String], resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.rejectVendors(vendors) { success in
          resolve(success)
      }
  }

  @objc
  func acceptPurposes(_ purposes: [String], updatePurpose: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.acceptPurposes(purposes, updatePurpose: updatePurpose) { success in
          resolve(success)
      }
  }

  @objc
  func rejectPurposes(_ purposes: [String], updateVendor: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.cmpManager.rejectPurposes(purposes, updateVendor: updateVendor) { success in
          resolve(success)
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
      self.cmpManager.resetConsentManagementData(completion: { success in resolve(success)})
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
}
