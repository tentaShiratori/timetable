# tauri-plugin-notification: release (R8) で schedule 付き notify が黙って失敗する

上流 issue 用の下書き。投稿先の想定: [tauri-apps/plugins-workspace](https://github.com/tauri-apps/plugins-workspace)（`plugins/notification`）。

## 対象パッケージ

| 名前 | バージョン（本リポジトリ） | 備考 |
| --- | --- | --- |
| `tauri-plugin-notification` (Rust) | **2.3.3** | `src-tauri/Cargo.lock` |
| `@tauri-apps/plugin-notification` (npm) | **~2.3.3** | `package.json` |
| Android ライブラリ namespace | `app.tauri.notification` | Kotlin プラグイン本体 |

Tauri **2.x** / Android **minSdk 24**, **targetSdk 36** の release ビルド（`isMinifyEnabled = true`）で確認。

## バグの内容

### 症状

- **debug ビルド**（`isMinifyEnabled = false`）では、`Schedule.interval` / `Schedule.at` 付きの `sendNotification` から **AlarmManager に pending alarm が登録され、通知が届く**。
- **release ビルド**（R8 有効）で、**通知権限・exact alarm 許可が ON でも**:
  - `TimedNotificationPublisher` 向けの pending alarm が **0 件**のまま
  - 予定リマインド（週次 schedule）が **一切届かない**
  - 即時通知（`schedule` なし）だけ動く場合がある（未検証だが理論上ありうる）

### 技術的な原因（推定）

1. JS → `plugin:notification|notify` → Kotlin `NotificationPlugin.show`
2. 引数 JSON を **Jackson** が `Notification` / `NotificationSchedule`（`Interval` の `DateMatch` 等）にデシリアライズ
3. `schedule != null` のとき `TauriNotificationManager.triggerScheduledNotification` が `AlarmManager` に登録

R8 が `app.tauri.notification.**` を難読化・削除すると、Jackson のリフレクション前提のデシリアライズが失敗し、**schedule 付き登録まで到達しない**（または `schedule` が解釈されない）。

### なぜ気づきにくいか

| 要因 | 説明 |
| --- | --- |
| release では Tauri Logger が無効 | `app.tauri.Logger` は `BuildConfig.DEBUG` 時のみ logcat 出力。パース失敗の痕跡が残りにくい |
| JS 側で失敗が見えない | `window.Notification` ラッパーが `void sendNotification(...)` で invoke しており、reject が握りつぶされうる |
| 通知権限と混同しやすい | `POST_NOTIFICATIONS` 未許可でも同様に alarm 未登録。ProGuard 単体の切り分けには **keep あり/なしの release 比較**が必要 |

### プラグイン側の不足

`tauri-plugin-notification` の Android `build.gradle.kts` は `consumerProguardFiles("consumer-rules.pro")` を参照するが、**実質空の ProGuard ルール**しかなく、利用側アプリの R8 に Jackson 用 keep がマージされない。

## 再現手順

### 前提

- Android 実機またはエミュレータ
- release APK を `isMinifyEnabled = true` でビルド
- **アプリ側 `proguard-rules.pro` に `app.tauri.notification.**` の keep を入れない**（再現用）

### 手順

1. release APK をビルド・インストールする（例: `pnpm tauri android build --apk`）。
2. 端末で **アプリの通知を ON**、`SCHEDULE_EXACT_ALARM` も許可する（権限問題と切り分けるため）。
3. アプリから schedule 付き通知を 1 回送る。例:

   ```typescript
   import { Schedule, sendNotification } from "@tauri-apps/plugin-notification";

   sendNotification({
     id: 1,
     title: "test",
     body: "test",
     channelId: "test", // 事前に createChannel 済み
     schedule: Schedule.interval(
       { weekday: 2, hour: 12, minute: 0 },
       true,
     ),
   });
   ```

4. host PC で pending alarm を確認:

   ```powershell
   adb shell dumpsys alarm | findstr /i "TimedNotification com.tenta"
   ```

   または本リポジトリの `.\scripts\check-android-alarms.ps1 -Package <applicationId>`

### 期待結果

`app.tauri.notification.TimedNotificationPublisher` 向けの **RTC / RTC_WAKEUP** pending が 1 件以上見える。

### 実際の結果（バグ）

- pending alarm **0 件**
- 指定時刻に通知 **来ない**

### 対照実験（本リポジトリで実施済み）

`src-tauri/gen/android/app/proguard-rules.pro` に以下を追加した release では、上記手順で **alarm 登録・通知到達が復旧**する。

```proguard
-keepattributes *Annotation*,InnerClasses,EnclosingMethod,Signature
-keep class app.tauri.notification.** { *; }
-keepclassmembers class app.tauri.notification.** { *; }
```

keep **なし** release との差分で、R8 がクリティカルであることを実機確認済み（2026-08-31）。

## 影響度

**高**。schedule 付き通知（リマインド・アラーム）は Tauri Android アプリの release 標準構成（minify 有効）で **黙って全滅**しうる。debug のみのテストでは検出できない。

## 望ましい修正（上流）

1. プラグインの **`consumer-rules.pro`** に Jackson / `@InvokeArg` / `NotificationSchedule` デシリアライズに必要な keep を追加し、利用側アプリにマージする。
2. 可能なら `show` / `notify` 失敗時に release でも trace 可能なログまたは invoke エラーを返す（黙殺を避ける）。
3. Android ドキュメントに「release ビルドでは schedule 付き通知の動作確認必須」と R8 注意を明記。

## 本リポジトリでの回避策

- [../tech-decisions/notification.md](../tech-decisions/notification.md) — R8 節
- [../android-release.md](../android-release.md) — 動作確認・診断スクリプト
- `src-tauri/gen/android/app/proguard-rules.pro` — keep ルール

## issue 投稿用メタ（コピペ用）

**Title（案）:** `Android release (R8): scheduled notifications silently fail without ProGuard keep rules for app.tauri.notification.**`

**Labels（案）:** `bug`, `platform: Android`, `plugin: notification`

**Environment:** `tauri-plugin-notification` 2.3.3, Tauri 2.x, Android release + `isMinifyEnabled true`
