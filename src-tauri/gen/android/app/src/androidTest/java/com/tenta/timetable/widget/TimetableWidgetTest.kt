package com.tenta.timetable.widget

import androidx.glance.appwidget.testing.unit.runGlanceAppWidgetUnitTest
import androidx.glance.testing.unit.hasTestTag
import androidx.glance.testing.unit.hasTextEqualTo
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith

private val MATH = WidgetEvent(
  id = "math",
  title = "数学",
  dayOfWeek = 0,
  startMinutes = 9 * 60,
  endMinutes = 10 * 60,
)

private fun byDay(vararg events: WidgetEvent): List<List<WidgetEvent>> =
  DAY_LABELS.indices.map { day -> events.filter { it.dayOfWeek == day } }

@RunWith(AndroidJUnit4::class)
class TimetableWidgetTest {
  @Test
  fun 予定が無くても6時から24時までのグリッドを出す() = runGlanceAppWidgetUnitTest {
    setContext(ApplicationProvider.getApplicationContext())
    provideComposable { WidgetBody(emptyList()) }

    onAllNodes(hasTestTag(TIME_LABEL_TAG)).assertCountEquals(GRID_SLOT_COUNT)
    onNode(hasTextEqualTo("6:00")).assertExists()
    onNode(hasTextEqualTo("23:00")).assertExists()
    onNode(hasTextEqualTo("5:30")).assertDoesNotExist()
  }

  @Test
  fun 曜日ヘッダーは月から日までの7列を出す() = runGlanceAppWidgetUnitTest {
    setContext(ApplicationProvider.getApplicationContext())
    provideComposable { WidgetBody(emptyList()) }

    onAllNodes(hasTestTag(DAY_LABEL_TAG)).assertCountEquals(DAY_LABELS.size)
    onNode(hasTextEqualTo("月")).assertExists()
    onNode(hasTextEqualTo("日")).assertExists()
  }

  @Test
  fun 予定が始まるスロットにはその曜日にだけタイトルを出す() = runGlanceAppWidgetUnitTest {
    setContext(ApplicationProvider.getApplicationContext())
    provideComposable { SlotRow(9 * 60, byDay(MATH)) }

    onNode(hasTextEqualTo("数学")).assertExists()
    onAllNodes(hasTestTag(EVENT_TAG)).assertCountEquals(1)
  }

  @Test
  fun 予定が続くだけのスロットは色だけ残してタイトルを出さない() = runGlanceAppWidgetUnitTest {
    setContext(ApplicationProvider.getApplicationContext())
    provideComposable { SlotRow(9 * 60 + 30, byDay(MATH)) }

    onNode(hasTextEqualTo("数学")).assertDoesNotExist()
    onAllNodes(hasTestTag(EVENT_TAG)).assertCountEquals(1)
  }
}
