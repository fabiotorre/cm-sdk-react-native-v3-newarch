package com.cmsdkreactnativev3

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ActivityBindingTest {
  @Test
  fun rebindsWhenNothingBoundYet() {
    val next = Any()
    assertTrue(shouldRebindActivity(null, next))
  }

  @Test
  fun skipsWhenSameInstance() {
    val activity = Any()
    assertFalse(shouldRebindActivity(activity, activity))
  }

  @Test
  fun rebindsWhenInstanceChanged() {
    val previous = Any()
    val next = Any()
    assertTrue(shouldRebindActivity(previous, next))
  }
}
