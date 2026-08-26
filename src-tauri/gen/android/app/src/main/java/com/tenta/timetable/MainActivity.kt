package com.tenta.timetable

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.tenta.timetable.widget.refreshTimetableWidgets
import kotlinx.coroutines.launch

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onStop() {
    super.onStop()
    // 予定は WebView 側から保存されるので、アプリを離れた時点のファイルを読み直させる。
    // Activity が破棄されても走りきるようプロセス寿命のスコープを使う
    ProcessLifecycleOwner.get().lifecycleScope.launch {
      refreshTimetableWidgets(applicationContext)
    }
  }
}
