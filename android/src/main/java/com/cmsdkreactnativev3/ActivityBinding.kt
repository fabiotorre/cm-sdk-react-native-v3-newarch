package com.cmsdkreactnativev3

/**
 * Native cmsdkv3 recreates its WebView on every [CMPManager.setActivity] call while the
 * previous WebView is not attached to a window (cold-start / off-screen case).
 * Rebinding the same Activity instance is therefore wasted work and doubles Chromium startup.
 */
internal fun shouldRebindActivity(boundActivity: Any?, nextActivity: Any): Boolean =
  boundActivity !== nextActivity
