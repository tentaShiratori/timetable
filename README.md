# Timetable

Google カレンダーの週表示に近い画面で、曜日ごとの予定を書き込む Android アプリです。日付は進みません。月〜日の枠を固定した時間割として使います。

対象は Android のみです。デスクトップ（Windows / macOS / Linux）と iOS は扱いません。

詳細仕様は [docs/spec.md](docs/spec.md)、実装 TODO は [docs/todo.md](docs/todo.md) を参照してください。

## 機能

- 週グリッド（月〜日 × 時刻）の表示
- 予定の追加・編集・削除
- 予定のローカル保存

## 必要環境

- Node.js 18+
- pnpm
- Rust
- JDK 21（`mise` が `temurin-21` を入れる。Android Studio 付属の JBR 25 では Gradle が落ちることがある）
- Android Studio（SDK / NDK / エミュレータまたは実機）
- [Tauri の前提条件（Android 含む）](https://v2.tauri.app/start/prerequisites/)

## セットアップ

```bash
pnpm install
```

## 開発

```bash
# フロントのみ（ブラウザで UI 確認）
pnpm dev

# 初回のみ: Android プロジェクトを生成
pnpm tauri android init

# エミュレータまたは実機で起動
pnpm tauri android dev
```

## ビルド

```bash
pnpm tauri android build
```

## テスト

```bash
# 例: 対象ファイルを指定して実行
pnpm test run <ファイル名>
```

## 技術スタック

- [Tauri 2](https://v2.tauri.app/)（Android）
- React 19
- TypeScript
- Vite
- Vitest + Testing Library
