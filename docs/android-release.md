# Android リリースビルドと実機インストール

署名付きの release APK を作り、USB で繋いだ Android 実機に入れるまでの手順。

Play ストアへの配布は v0.1 の対象外なので、ここでは APK の直接インストールだけを扱う。ストア配布が必要になったら AAB（`--aab`）に切り替える。

開発中の起動は `pnpm tauri android dev` で足りる。こちらは debug 署名なので、この文書の署名設定は要らない。

## 前提

- `mise install` 済み（JDK は Temurin 21。理由は [tech-decisions/android-jdk.md](./tech-decisions/android-jdk.md)）
- Android Studio で SDK と NDK を入れてある
- 環境変数が通っている

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\<バージョン>"
```

- Rust の Android ターゲットが入っている

```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

- `adb` が使える（`$env:ANDROID_HOME\platform-tools\adb.exe`。PATH に入れておくと楽）

## 1. キーストアを作る（初回のみ）

release APK は署名が要る。一度作った鍵は無くさないこと。同じ鍵で署名し続けないと、既にインストール済みのアプリを上書き更新できない。

```powershell
keytool -genkey -v -keystore $env:USERPROFILE\timetable-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

`.jks` はリポジトリに入れない。手元とバックアップだけに置く。

## 2. keystore.properties を置く（初回のみ）

`src-tauri/gen/android/keystore.properties` を作る。

```properties
password=<keytool で決めたパスワード>
keyAlias=upload
storeFile=C:\\Users\\<ユーザー名>\\timetable-upload.jks
```

区切りは `\\`（バックスラッシュ 2 つ）。このファイルは `src-tauri/gen/android/.gitignore` で無視されるので、コミットされない。

## 3. Gradle に署名設定を入れる（初回のみ）

`src-tauri/gen/android/app/build.gradle.kts` は生成時点では release の署名設定を持っていない。次を追記する。

先頭の import に 1 行足す。

```kotlin
import java.io.FileInputStream
```

`buildTypes` ブロックの手前に `signingConfigs` を足す。

```kotlin
signingConfigs {
    create("release") {
        val keystorePropertiesFile = rootProject.file("keystore.properties")
        val keystoreProperties = Properties()
        if (keystorePropertiesFile.exists()) {
            keystoreProperties.load(FileInputStream(keystorePropertiesFile))
        }
        keyAlias = keystoreProperties["keyAlias"] as String
        keyPassword = keystoreProperties["password"] as String
        storeFile = file(keystoreProperties["storeFile"] as String)
        storePassword = keystoreProperties["password"] as String
    }
}
```

`buildTypes` の `release` で、その設定を使う。

```kotlin
getByName("release") {
    signingConfig = signingConfigs.getByName("release")
    isMinifyEnabled = true
    // proguardFiles(...) は生成時のまま
}
```

## 4. release ビルド

```powershell
pnpm tauri android build --apk
```

`beforeBuildCommand` で `pnpm build`（`tsc && vite build`）が走ってから、4 アーキテクチャ分の Rust ライブラリがビルドされる。初回は 10 分以上かかることがある。

成果物はここに出る。

```
src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

ファイル名が `app-universal-release-unsigned.apk` になっていたら、署名設定が効いていない。手順 2〜3 を見直す。

実機 1 台に入れるだけならサイズを削れる。最近の端末はほぼ arm64。

```powershell
pnpm tauri android build --apk --target aarch64
```

この場合の出力は `app/build/outputs/apk/arm64/release/app-arm64-release.apk`。

## 5. 実機を繋ぐ

### 開発者向けオプションを出す

Android は初期状態では開発者向けの設定画面が隠れている。まず出す。

1. 設定 → デバイス情報（端末情報）
2. **ビルド番号** を 7 回連続でタップする
3. 画面ロックを設定していれば PIN / パターンを聞かれるので入力する
4. 「これでデベロッパーになりました」と出たら成功

以降、設定 → システム → 開発者向けオプション から開ける（メーカーによっては 設定 → システム の直下や、設定の最下段に出る）。

### USB デバッグを ON にする

**開発者モードを出しただけでは ADB は使えない。** 中にある個別のトグルを入れる必要がある。

1. 設定 → システム → 開発者向けオプション
2. 一番上のマスタースイッチが ON になっていることを確認する
3. **「USB デバッグ」** を ON にする（「ワイヤレス デバッグ」は別物）
4. 確認ダイアログで「OK」

### 繋いで承認する

1. USB ケーブルで PC に繋ぐ（充電専用ケーブルではなくデータ転送対応のもの）
2. 端末に「USB デバッグを許可しますか？」が出たら **許可** する
3. 「このパソコンからの USB デバッグを常に許可する」にチェックを入れておくと、次回から聞かれない

認識を確認する。

```powershell
adb devices
```

シリアル番号と `device` が出れば OK。

### 繋がらないときの切り分け

`adb devices` に何も出ないときは、まず Windows が端末を見えているかを確認する。ここが分かると、原因が PC 側（ケーブル・ドライバ）か端末側（設定）かを切り分けられる。

```powershell
Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like '*VID_18D1*' } | Select-Object Status,Class,FriendlyName,InstanceId | Format-List
```

`VID_18D1` は Google の USB ベンダー ID。他メーカーの端末なら `Get-PnpDevice -PresentOnly -Class WPD` などで探す。

**何も出ない場合**は PC 側の問題。ケーブルが充電専用、ポートの不良、ドライバ未導入のいずれか。Pixel 以外は各メーカーの USB ドライバが要ることがある。

**出るが `adb devices` は空の場合**は端末側の問題。`InstanceId` の `PID_` を見る。Google 端末では次の割り当てになっていて、ADB が有効なら末尾が変わる。

| PID    | モード                                |
| ------ | ------------------------------------- |
| `4EE1` | MTP（ファイル転送）のみ。**ADB 無効** |
| `4EE2` | MTP + ADB                             |
| `4EE6` | PTP + ADB                             |
| `4EE7` | 充電のみ + ADB                        |

`4EE1` なら USB デバッグが効いていないので、上の「USB デバッグを ON にする」をやり直してケーブルを挿し直す。`Class` が `AndroidUsbDeviceClass` ではなく `WPD` だけなのも同じサイン。

**`unauthorized` と出る場合**は承認ダイアログを許可していない。ダイアログが出てこないなら、過去に「許可しない」を選んだ記録が残っている。開発者向けオプションの **「USB デバッグの許可を取り消す」** を実行してから挿し直す。

**それでも駄目なら** adb サーバを入れ直す。

```powershell
adb kill-server; adb start-server; adb devices
```

## 6. インストール

```powershell
adb install -r src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk
```

`INSTALL_FAILED_UPDATE_INCOMPATIBLE` が出たら、署名の違う版（`pnpm tauri android dev` で入れた debug 版など）が残っている。消してから入れ直す。

```powershell
adb uninstall com.tenta.timetable
```

## 7. 動作確認

release ビルドは R8 の圧縮・難読化（`isMinifyEnabled = true`）が効くので、debug で動いても release で壊れることがある。入れたら最低限これを見る。

- 週グリッドが表示される
- 空きマスをタップして予定を追加できる
- 予定をタップして編集・削除できる
- アプリを終了して再起動しても予定が残っている（`load_app_file` / `save_app_file` が動いている）

落ちたときはログを見る。

```powershell
adb logcat -s RustStdoutStderr Tauri AndroidRuntime
```

## バージョンを上げる

`versionName` と `versionCode` は `src-tauri/Cargo.toml` の `version` から作られる（`tauri.conf.json` に `version` を書いていないため）。`versionCode = major * 1000000 + minor * 1000 + patch` なので、`0.2.0` なら `2000`。

同じ端末に上書き更新するには `versionCode` が前より大きい必要がある。更新版を配るときは `Cargo.toml` の `version` を上げる。
