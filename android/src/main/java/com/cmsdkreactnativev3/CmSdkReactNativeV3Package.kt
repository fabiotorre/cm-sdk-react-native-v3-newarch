package com.cmsdkreactnativev3

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class CmSdkReactNativeV3Package : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == CmSdkReactNativeV3Module.NAME) {
      CmSdkReactNativeV3Module(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        CmSdkReactNativeV3Module.NAME to ReactModuleInfo(
          CmSdkReactNativeV3Module.NAME,
          CmSdkReactNativeV3Module.NAME,
          false,
          false,
          false,
          true
        )
      )
    }
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
