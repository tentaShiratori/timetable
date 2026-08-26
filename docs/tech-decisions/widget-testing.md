# ウィジェットのテスト

- 日付: 2026-08-26
- 状態: 採用（実装済み）
- 対象: [android-widget.md](./android-widget.md) のホーム画面ウィジェット

## 結論

ウィジェットの Kotlin は **エミュレータ上の計装テスト（`androidTest`）** で確かめる。Composable の中身は Glance 公式の **`androidx.glance:glance-appwidget-testing`** で検証する。

```kotlin
androidTestImplementation("androidx.test.ext:junit:1.2.1")
androidTestImplementation("androidx.glance:glance-testing:1.1.1")
androidTestImplementation("androidx.glance:glance-appwidget-testing:1.1.1")
```

テストは `src-tauri/gen/android/app/src/androidTest/java/com/tenta/timetable/widget/` に置く。

- `WidgetGridTest.kt`: グリッドの範囲、重なりの取り出し、`events.json` のパース、開始時刻の色、曜日インデックス
- `TimetableWidgetTest.kt`: Composable が出すノード（時刻ラベル、曜日ヘッダー、予定のタイトル）

## 実行方法

エミュレータを起動したうえで、`src-tauri/gen/android` からクラスを 1 つ指定して実行する。フロントの `pnpm test run {ファイル名}` と同じく、まとめて実行はしない。

```powershell
.\gradlew.bat :app:connectedUniversalDebugAndroidTest -x :app:rustBuildUniversalDebug "-Pandroid.testInstrumentationRunnerArguments.class=com.tenta.timetable.widget.WidgetGridTest"
```

`-x :app:rustBuildUniversalDebug` が要る。この Gradle タスクは `pnpm tauri android android-studio-script` を呼ぶだけの薄いラッパで、Tauri CLI が張る WebSocket からビルド設定を受け取る。つまり `tauri android dev` / `build` の中からしか成功せず、素の Gradle から叩くと `ConnectionRefused` で落ちる。ウィジェットのテストは WebView も Rust 側のコマンドも触らないので、`libtimetable.so` の無い APK で問題ない。

## なぜ Robolectric ではないのか

Glance のユニットテスト API は JVM でも動くが、`LocalContext` を使う Composable や `org.json` を使う `parseEvents` を JVM で動かすには Robolectric が要る。素の JVM ユニットテストでは `android.jar` がスタブなので `JSONArray` が例外を投げる。

Robolectric を足せばエミュレータ無しで速く回せるが、

- SDK 36 に対応するのは Robolectric 4.16 以降で、実行に JDK 21 が要る（[android-jdk.md](./android-jdk.md) の通り JDK 21 は入っているので、これ自体は満たせる）
- 初回に `android-all` の jar をダウンロードする
- 「実機に近い環境で確かめたい」というウィジェットの性質と噛み合わない

Android 開発をこのリポジトリでするのは実質ウィジェットだけで、エミュレータは [android-release.md](../android-release.md) の手順で結局立てる。テスト環境をもう 1 つ増やすより、既にあるエミュレータに寄せるほうが単純だと判断した。パースもファイル読みも本物の実装で動く。

## 棄却したもの

**Espresso / UiAutomator でホーム画面に配置して確かめる**

配置・更新・タップまで通しで見られる唯一の方法。ただし Glance 自身のテストで使われている `AppWidgetHostRule` は AndroidX のリポジトリ内部にあり、artifact として公開されていない。ホスト側を自前で組むことになるので見合わない。ここは手動確認に残す。

**スクリーンショットテスト（Paparazzi / Roborazzi）**

Paparazzi は RemoteViews を描けないので Glance には使えない。Roborazzi なら `AppWidgetHostView` 経由で可能だが、基準画像の管理コストに対して得られるものが少ない。

**グリッド計算を TypeScript 側に寄せて Vitest で見る**

Kotlin と TypeScript で同じ計算を二重に持つ現状は変わらず、橋渡しの仕組みだけが増える。

## 注意

**`hasText` は部分一致** である。`hasText("6:00")` は `"16:00"` にもマッチするので、時刻ラベルのように紛れるものは `hasTextEqualTo` を使う。

**テスト対象の Composable は `internal` にする。** `androidTest` は同じモジュールの friend として扱われるので `internal` で届く。Glance のドキュメントも「Composable は `GlanceAppWidget` クラスの外に出せ」としており、`TimetableWidget.kt` はそれに従っている。

**ノードの目印は `GlanceModifier.semantics { testTag = ... }`** で付ける。タグの定数は `WidgetGrid.kt` に置いて本体とテストで共有する。

**テスト関数名を数字で始められない。** Kotlin のバッククォート無し識別子の制約なので、`24時は…` ではなく `日付をまたぐ手前の時刻は…` のように書く。

**Glance のユニットテスト API は描画しない。** 合成された Emittable のツリーを見るだけなので、`LazyColumn` の item は「画面に見えているか」ではなく「ツリーに出ているか」の検証になる。行の高さ、はみ出し、実際のスクロールは検出できない。そこは引き続きエミュレータでの目視。

## 見直しのきっかけ

- エミュレータ起動が面倒でテストを書かなくなった（Robolectric を再検討する）
- ウィジェットの見た目の崩れを繰り返すようになった（スクリーンショットテストを再検討する）
- Kotlin 側のロジックが増えて、実行の遅さが効いてきた
