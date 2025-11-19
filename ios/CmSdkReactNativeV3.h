#import <React/RCTEventEmitter.h>

#ifdef __cplusplus
#import <CmSdkReactNativeV3Spec/CmSdkReactNativeV3Spec.h>
#endif

NS_ASSUME_NONNULL_BEGIN

#ifdef __cplusplus
@interface CmSdkReactNativeV3 : RCTEventEmitter <NativeCmSdkReactNativeV3Spec>
#else
@interface CmSdkReactNativeV3 : RCTEventEmitter
#endif
@end

NS_ASSUME_NONNULL_END
