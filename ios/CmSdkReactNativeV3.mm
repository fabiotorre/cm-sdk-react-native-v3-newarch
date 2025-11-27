#import "CmSdkReactNativeV3.h"
#import "CmSdkReactNativeV3Impl.h"
#import <CmSdkReactNativeV3Spec/CmSdkReactNativeV3Spec.h>
#import <ReactCommon/RCTTurboModule.h>

@interface CmSdkReactNativeV3 ()
@property(nonatomic, strong) CmSdkReactNativeV3Impl *implementation;
@end

@implementation CmSdkReactNativeV3

RCT_EXPORT_MODULE(CmSdkReactNativeV3)

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (instancetype)init {
  if (self = [super init]) {
    _implementation =
        [[CmSdkReactNativeV3Impl alloc] initWithEventEmitter:self];
  }
  return self;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[
    @"didReceiveConsent", @"didShowConsentLayer", @"didCloseConsentLayer",
    @"didReceiveError", @"onClickLink", @"didChangeATTStatus"
  ];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeCmSdkReactNativeV3SpecJSI>(
      params);
}

// TurboModule methods - delegate to Swift implementation

- (void)setUrlConfig:(JS::NativeCmSdkReactNativeV3::UrlConfig &)config
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  NSDictionary *configDict = @{
    @"id" : config.id_(),
    @"domain" : config.domain(),
    @"language" : config.language(),
    @"appName" : config.appName(),
    @"noHash" : config.noHash().has_value() ? @(config.noHash().value()) : @NO
  };
  [_implementation setUrlConfig:configDict resolve:resolve reject:reject];
}

- (void)setWebViewConfig:(JS::NativeCmSdkReactNativeV3::WebViewConfig &)config
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  NSMutableDictionary *configDict = [NSMutableDictionary new];
  if (config.position())
    configDict[@"position"] = config.position();
  if (config.cornerRadius().has_value())
    configDict[@"cornerRadius"] = @(config.cornerRadius().value());
  if (config.respectsSafeArea().has_value())
    configDict[@"respectsSafeArea"] = @(config.respectsSafeArea().value());
  if (config.allowsOrientationChanges().has_value())
    configDict[@"allowsOrientationChanges"] =
        @(config.allowsOrientationChanges().value());
  if (config.customRect().has_value()) {
    auto rect = config.customRect().value();
    configDict[@"customRect"] = @{
      @"x" : @(rect.x()),
      @"y" : @(rect.y()),
      @"width" : @(rect.width()),
      @"height" : @(rect.height())
    };
  }
  if (config.backgroundStyle()) {
    auto bgStyleObj = config.backgroundStyle();
    // backgroundStyle returns an id<NSObject> that we need to convert to
    // dictionary The codegen creates a struct, but we access it as a generic
    // object
    NSMutableDictionary *bgDict = [NSMutableDictionary new];

    // Use NSDictionary conversion since the codegen returns an object
    if ([bgStyleObj respondsToSelector:@selector(objectForKey:)]) {
      NSDictionary *bgStyle = (NSDictionary *)bgStyleObj;
      if (bgStyle[@"type"])
        bgDict[@"type"] = bgStyle[@"type"];
      if (bgStyle[@"color"])
        bgDict[@"color"] = bgStyle[@"color"];
      if (bgStyle[@"opacity"])
        bgDict[@"opacity"] = bgStyle[@"opacity"];
      if (bgStyle[@"blurEffectStyle"])
        bgDict[@"blurEffectStyle"] = bgStyle[@"blurEffectStyle"];
    }
    configDict[@"backgroundStyle"] = bgDict;
  }
  [_implementation setWebViewConfig:configDict resolve:resolve reject:reject];
}

- (void)setATTStatus:(double)status
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  [_implementation setATTStatus:(NSInteger)status
                        resolve:resolve
                         reject:reject];
}

- (void)checkAndOpen:(BOOL)jumpToSettings
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
  [_implementation checkAndOpen:jumpToSettings resolve:resolve reject:reject];
}

- (void)forceOpen:(BOOL)jumpToSettings
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [_implementation forceOpen:jumpToSettings resolve:resolve reject:reject];
}

- (void)getUserStatus:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [_implementation getUserStatus:resolve reject:reject];
}

- (void)getStatusForPurpose:(NSString *)purposeId
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject {
  [_implementation getStatusForPurpose:purposeId resolve:resolve reject:reject];
}

- (void)getStatusForVendor:(NSString *)vendorId
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject {
  [_implementation getStatusForVendor:vendorId resolve:resolve reject:reject];
}

- (void)getGoogleConsentModeStatus:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject {
  [_implementation getGoogleConsentModeStatus:resolve reject:reject];
}

- (void)exportCMPInfo:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [_implementation exportCMPInfo:resolve reject:reject];
}

- (void)importCMPInfo:(NSString *)cmpString
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [_implementation importCMPInfo:cmpString resolve:resolve reject:reject];
}

- (void)resetConsentManagementData:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject {
  [_implementation resetConsentManagementData:resolve reject:reject];
}

- (void)acceptVendors:(NSArray *)vendors
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [_implementation acceptVendors:vendors resolve:resolve reject:reject];
}

- (void)rejectVendors:(NSArray *)vendors
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
  [_implementation rejectVendors:vendors resolve:resolve reject:reject];
}

- (void)acceptPurposes:(NSArray *)purposes
         updatePurpose:(BOOL)updatePurpose
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
  [_implementation acceptPurposes:purposes
                    updatePurpose:updatePurpose
                          resolve:resolve
                           reject:reject];
}

- (void)rejectPurposes:(NSArray *)purposes
          updateVendor:(BOOL)updateVendor
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject {
  [_implementation rejectPurposes:purposes
                     updateVendor:updateVendor
                          resolve:resolve
                           reject:reject];
}

- (void)rejectAll:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [_implementation rejectAll:resolve reject:reject];
}

- (void)acceptAll:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject {
  [_implementation acceptAll:resolve reject:reject];
}

- (void)addListener:(NSString *)eventName {
  [super addListener:eventName];
}

- (void)removeListeners:(double)count {
  [super removeListeners:count];
}

@end
