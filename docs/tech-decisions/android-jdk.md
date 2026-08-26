# Android ビルドの JDK / Gradle

## 結論

- Gradle Wrapper は **8.14.4** を使う
- プロジェクトの JDK は mise で **Temurin 21** を入れる

## 背景

`pnpm tauri android dev` が次のエラーで落ちた。

```
BUG! exception in phase 'semantic analysis' in source unit '_BuildScript_'
Unsupported class file major version 69
```

major version 69 は Java 25。ユーザー環境の `JAVA_HOME` が Android Studio 付属 JBR（25.0.2）を指しており、テンプレートの Gradle **8.14.3** は Java 25 でビルドスクリプトを解析できない。

## 検討

| 案 | 判断 |
| --- | --- |
| Gradle を 8.14.4 に上げる | 採用。8.14.4 で Java 25 上の当該エラーは解消される |
| Gradle を 9.x にする | 不採用。AGP 8.11.0 のサポート範囲外 |
| JDK 21 を mise で固定する | 採用。AGP 8.11 は JDK 17 必須で、21 が現行の推奨 LTS |
| `JAVA_HOME` を JBR のままにする | 非推奨。Studio 用ランタイムであり、CLI の Gradle 向けではない |

## 運用

再生成（`pnpm tauri android init`）で Wrapper が 8.14.3 に戻ったら、再度 8.14.4 にする。
