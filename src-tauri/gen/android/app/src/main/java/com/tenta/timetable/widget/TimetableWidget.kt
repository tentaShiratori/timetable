package com.tenta.timetable.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.semantics.semantics
import androidx.glance.semantics.testTag
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.tenta.timetable.MainActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val SURFACE = Color(0xFFFFFFFF)
private val STRIPE = Color(0xFFF2F8F7)
private val INK = Color(0xFF14323A)
private val INK_MUTED = Color(0xFF5A7A80)
private val ACCENT = Color(0xFF0F766E)
private val CORAL = Color(0xFFF97316)
private val EVENT_COLORS = listOf(ACCENT, CORAL, Color(0xFFEAB308), Color(0xFF14B8A6))

private val TIME_COLUMN_WIDTH = 26.dp
private val HEADER_HEIGHT = 16.dp
private val SLOT_HEIGHT = 14.dp

private val EVENTS_VERSION_KEY = longPreferencesKey("eventsVersion")

class TimetableWidget : GlanceAppWidget() {
  /**
   * provideContent に入ったあとセッションは生き続け、この関数は再実行されない。
   * そのため予定は合成のたびにファイルから読み、state には更新の合図だけを置く
   */
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    storeVersion(context, id)
    provideContent {
      val version = currentState(EVENTS_VERSION_KEY) ?: 0L
      WidgetBody(remember(version) { parseEvents(readEventsRaw(context)) })
    }
  }
}

/** 保存済みの予定を読み直してウィジェットに反映する。 */
suspend fun refreshTimetableWidgets(context: Context) {
  GlanceAppWidgetManager(context)
    .getGlanceIds(TimetableWidget::class.java)
    .forEach { id -> storeVersion(context, id) }
  TimetableWidget().updateAll(context)
}

private suspend fun storeVersion(context: Context, id: GlanceId) {
  val version = withContext(Dispatchers.IO) { eventsVersion(context) }
  updateAppWidgetState(context, id) { prefs -> prefs[EVENTS_VERSION_KEY] = version }
}

@Composable
internal fun WidgetBody(events: List<WidgetEvent>) {
  val eventsByDay = DAY_LABELS.indices.map { day -> events.filter { it.dayOfWeek == day } }

  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(SURFACE)
      .appWidgetBackground()
      .cornerRadius(16.dp)
      .padding(4.dp)
      .clickable(actionStartActivity<MainActivity>()),
  ) {
    DayHeader()
    LazyColumn(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
      items(GRID_SLOT_COUNT) { index ->
        SlotRow(GRID_START_MINUTES + index * SLOT_MINUTES, eventsByDay)
      }
    }
  }
}

@Composable
private fun DayHeader() {
  Row(modifier = GlanceModifier.fillMaxWidth().height(HEADER_HEIGHT)) {
    Spacer(modifier = GlanceModifier.width(TIME_COLUMN_WIDTH))
    DAY_LABELS.forEachIndexed { day, label ->
      Text(
        text = label,
        modifier = GlanceModifier.defaultWeight().semantics { testTag = DAY_LABEL_TAG },
        style = TextStyle(
          color = ColorProvider(dayLabelColor(day)),
          fontSize = 9.sp,
          fontWeight = FontWeight.Bold,
          textAlign = TextAlign.Center,
        ),
      )
    }
  }
}

@Composable
internal fun SlotRow(slotStartMinutes: Int, eventsByDay: List<List<WidgetEvent>>) {
  val isHourStart = slotStartMinutes % 60 == 0

  Row(
    modifier = GlanceModifier
      .fillMaxWidth()
      .height(SLOT_HEIGHT)
      .background(if (isHourStart) SURFACE else STRIPE)
      .clickable(actionStartActivity<MainActivity>()),
  ) {
    Box(
      modifier = GlanceModifier.width(TIME_COLUMN_WIDTH).fillMaxHeight(),
      contentAlignment = Alignment.TopEnd,
    ) {
      Text(
        text = if (isHourStart) formatMinutes(slotStartMinutes) else "",
        modifier = GlanceModifier.semantics { testTag = TIME_LABEL_TAG },
        style = TextStyle(color = ColorProvider(INK_MUTED), fontSize = 8.sp),
      )
    }
    eventsByDay.forEach { dayEvents ->
      DayCell(
        events = eventsAt(dayEvents, slotStartMinutes),
        slotStartMinutes = slotStartMinutes,
        modifier = GlanceModifier.defaultWeight().fillMaxHeight(),
      )
    }
  }
}

@Composable
internal fun DayCell(
  events: List<WidgetEvent>,
  slotStartMinutes: Int,
  modifier: GlanceModifier,
) {
  if (events.isEmpty()) {
    Spacer(modifier = modifier)
    return
  }

  Row(modifier = modifier) {
    events.forEach { event ->
      Box(
        modifier = GlanceModifier.defaultWeight().fillMaxHeight().background(eventColor(event.id)),
        contentAlignment = Alignment.CenterStart,
      ) {
        Text(
          text = if (startsInSlot(event, slotStartMinutes)) event.title else "",
          maxLines = 1,
          modifier = GlanceModifier.semantics { testTag = EVENT_TAG },
          style = TextStyle(
            color = ColorProvider(SURFACE),
            fontSize = 8.sp,
            fontWeight = FontWeight.Bold,
          ),
        )
      }
    }
  }
}

private fun dayLabelColor(day: Int): Color = when (day) {
  5 -> ACCENT
  6 -> CORAL
  else -> INK
}

private fun eventColor(id: String): Color {
  var hash = 0
  for (char in id) {
    hash = (hash + char.code) % EVENT_COLORS.size
  }
  return EVENT_COLORS[hash]
}
