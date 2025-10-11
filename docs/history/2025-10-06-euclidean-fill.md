# Euclidean 塗りつぶし検証（2025-10-06）

## Storybook Play
- `Scenes/Hinge Mirrors` / `Scenes/Regular Pentagon` / `Scenes/Regular Hexagon` の Play は `expectCanvasFill` を用いて中心および周辺ピクセルの α 値が閾値以上であることを検証します。
- `pnpm storybook` を起動後、`npm run test-storybook` で自動化テストを実行すると、反射テクスチャ矩形が適用された塗りつぶしが保証されます。

## 手動キャプチャ手順
1. `pnpm dev` を起動し、`http://localhost:5173` を開きます。
2. Euclidean モードに切り替え、`Regular Pentagon` プリセットを選択します。
3. 反射テクスチャを有効にした状態で交差多角形の中心付近をズームし、Canvas 上で `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`) からブラウザのスクリーンショット機能を呼び出します。
4. 撮影した画像を `docs/history/2025-10-06-euclidean-fill.png` として保存し、今後の検証資料として共有します。

> スクリーンショットは手動収集のためリポジトリには同梱していません。必要に応じて上記手順で再取得してください。
