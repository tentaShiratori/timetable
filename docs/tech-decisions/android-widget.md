# ホーム画面ウィジェット（Android）

- 日付: 2026-08-26
- 状態: 採用（実装済み）
- 対象: [spec.md](../spec.md) のウィジェット表示

## 結論

Android のホーム画面ウィジェットとして週グリッドを出す。実装は **Jetpack Glance**（Compose 風 API）で、`src-tauri/gen/android` に Kotlin を直接置く。

予定データは **アプリが書いている `events.json` をウィジェット側から直接読む**。Tauri の `app_data_dir` は Android では `Context.getDataDir()` なので、同一パッケージのウィジェットから `File(context.dataDir, "events.json")` で読める。橋渡しのための Rust コマンドやプラグインは足さない。

更新はアプリを離れたとき（`MainActivity.onStop`）に行う。定期更新（`updatePeriodMillis`）は使わない。

## 前提

- Tauri の WebView は Android ウィジェットを描けない。ウィジェットは必ずネイティブ（RemoteViews）になる
- 日付は持たないので「今日」の概念は不要。列は常に月〜日
- ウィジェットは狭い。7 列 + 時刻軸を数センチ角に収める必要がある

## 描画方法

### Glance の制約

Glance は Compose 風に書けるが、出力は RemoteViews なので次の制限を受ける。

- `Row` / `Column` / `Box` の**直接の子は 10 個まで**。超えると切り捨て or 例外
- スクロールする `LazyColumn` は**入れ子にできない**（`LazyColumn` の中に `LazyColumn` は不可）
- 座標での絶対配置ができない。`Canvas` も使えない

つまりアプリ側（[calendar-display.md](./calendar-display.md)）の「予定を分単位の座標で絶対配置する」方式はそのまま持ち込めない。

### 採用: 30 分スロットを 1 行として `LazyColumn` に並べる

```
[曜日ヘッダー]  月 火 水 木 金 土 日   ← Row（時刻列 + 7 列 = 子 8 個）
[LazyColumn]
  9:00  □ □ □ □ □ □ □               ← item ごとに Row（子 8 個）
  9:30  ■ □ □ □ □ □ □
 10:00  ■ □ □ □ □ □ □
```

- 1 行 = 30 分。行は `LazyColumn` の item なので**個数制限を受けない**
- 予定は「そのスロットに重なっていればセルを塗る」方式。連続するスロットが同じ色で並ぶので 1 つのブロックに見える
- タイトルは予定が始まるスロットにだけ出す
- 同じスロットに複数の予定があるときは、セル内を `Row` で横に分割する（アプリと同じく最大 3 本）

セル結合ではなく塗りなので、9:10〜10:25 のように 30 分に乗らない予定は 30 分単位に丸めて見える。ウィジェットは一覧性が目的なので許容し、正確な時刻はタップしてアプリで見る。

### 表示する時間帯

アプリと同じ **6:00〜24:00 固定**（30 分 × 36 行）。ウィジェットの高さでは全部は入らないので、残りは縦スクロールで見る。

「予定が入っている範囲に自動で合わせる」案も試したが採らなかった。行数は減って初期表示は詰まるが、予定を足すたびに行の位置と時刻の対応が動くので、置き場所を覚えて見るという使い方に合わない。アプリと同じ目盛りである方が読み替えが要らない。

### 棄却したもの

**Canvas で Bitmap を描いて `ImageView` に出す**

グリッドを完全に再現でき、10 子要素制限も受けない。ただし文字サイズ・解像度・端末ごとのスケールを全部自前で持つことになり、リサイズのたびに描き直しが必要。Glance の宣言的な記述を捨てる価値は今のところない。

**RemoteViews を手書き**

Glance でできることは全部できるが、記述量が増えるだけ。

**今日 1 日だけをリスト表示**

小さいウィジェットでは読みやすいが、「週を見渡す」という時間割の用途から外れる。

## 更新のタイミング

### 採用: アプリを離れたとき

`MainActivity.onStop` で `refreshTimetableWidgets` を呼ぶ。予定は WebView 側から `events.json` に書かれるので、アプリを離れた時点のファイルを読み直せば十分。

コルーチンは `ProcessLifecycleOwner` のスコープで起動する。Activity のスコープだと破棄時に途中で切られる。

### Glance の落とし穴: `provideGlance` は 1 回しか走らない

`provideContent` に入るとセッションは生き続け、`provideGlance` は再実行されない。そのため

```kotlin
// これは動かない。events は最初の 1 回で固定される
val events = loadEvents(context)
provideContent { WidgetBody(events) }
```

更新を届けるには **Glance の state を変えて再合成させる**必要がある。ここでは state に予定そのものを入れず、`events.json` の更新時刻だけを置く。合成のたびにファイルを読むので、データの二重管理が起きない。

```kotlin
provideContent {
  val version = currentState(EVENTS_VERSION_KEY) ?: 0L
  WidgetBody(remember(version) { parseEvents(readEventsRaw(context)) })
}
```

### 棄却したもの

- **`updatePeriodMillis` による定期更新**: 最短 30 分で、更新が要るのは編集直後だけなので噛み合わない。`0`（無効）にしている
- **保存のたびに Rust から JNI 経由で更新を叩く**: 即時反映できるが、Rust 側に Android 依存を持ち込む。アプリを離れた時点で足りている

## ビルド設定

Glance は Compose コンパイラを要求する。`src-tauri/gen/android` は Tauri が生成したものだが、次を手で足している。

- ルート `build.gradle.kts`: `kotlin-gradle-plugin` を **2.0.21** に上げ、`compose-compiler-gradle-plugin` を同じバージョンで追加
- `app/build.gradle.kts`: `org.jetbrains.kotlin.plugin.compose` を適用、`buildFeatures { compose = true }`、`androidx.glance:glance-appwidget`

Tauri の生成そのままの Kotlin 1.9.25 + `composeOptions { kotlinCompilerExtensionVersion }` では動かない。AGP 8.11 は `composeOptions` を見ずに Kotlin 2.x 系の Compose プラグインを載せるため、**エラーも警告も出ないまま Compose の変換だけが行われない**。結果として実行時に `NoSuchMethodError: provideContent` で落ちる。Kotlin と Compose プラグインのバージョンは必ず揃える。

## 注意

`src-tauri/gen/android` 配下は Tauri の生成物だが、ウィジェットのために手を入れているのでコミット対象にしている。`pnpm tauri android init` を再実行すると次が失われる。

- `app/src/main/java/com/tenta/timetable/widget/`
- `app/src/main/res/xml/timetable_widget_info.xml`
- `AndroidManifest.xml` の `<receiver>`
- 上記のビルド設定と `MainActivity.onStop`

## 見直しのきっかけ

- 30 分単位の丸めが実用上つらい（9:10 開始などが多い）
- 1 コンテナ 10 子要素の制限に当たる作りにしたくなった
- ウィジェットから予定を直接編集したくなった
