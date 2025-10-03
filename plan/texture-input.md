# テクスチャ入力基盤整備計画

## 目的
- 既存のジオデシック描画シェーダへ画像・ビデオ（カメラ）由来のテクスチャを入力し、Poincaré 円板の背面/下地として表示できるようにする。
- 今後のインタラクティブ表現（例: 群展開とテクスチャとの組み合わせ）に向けた WebGL 基盤を整備する。

## 現状整理
- `src/render/webgl/shaders/geodesic.frag` はジオデシックの SDF を計算し、単色ラインを α ブレンドで出力するのみでテクスチャサンプリング処理が存在しない。
- `src/render/webglRenderer.ts` ではフルスクリーントライアングルを描画し、`uGeodesicsA` などライン用 uniform 以外は未使用。テクスチャユニットやサンプラーの初期化が無い。
- 描画対象の `RenderScene` モデルにもテクスチャに関する情報が無く、CPU 側で画像/動画を WebGL テクスチャへ転送する仕組みが未整備。
- UI 側（React コンポーネント）は画像選択・カメラ入力を想定していない。

## 課題と要件
1. **GPU リソース管理**: 画像/動画のアップロード、サイズ変更、更新タイミング（video frame）を管理する層が必要。
2. **テクスチャ入力基盤**: フラグメントシェーダに複数テクスチャを渡せる uniform／サンプラーのセットアップを行い、描画時に選択的に有効化できるようにする。
3. **UI/データモデル拡張**: `RenderScene` などへテクスチャメタ情報（ソース種別、利用フラグ、UV 変換）を追加し、外部入力と WebGL を結線する。
4. **テスト戦略**: WebGL は自動テストが難しいため、ロジック部分（テクスチャロード、パラメータ変換）を単体テストでカバーし、Storybook/Playwright 等で視覚検証可能なフローを検討する。

## 実装ステップ案
1. **データモデル設計**
   - `RenderScene` にテクスチャ入力を表すオプショナルフィールド（ソース種別: none/image/video、UV transform、描画レイヤー種別など）を追加。
   - 画像/動画の読み込み状態を管理する `TextureSource` インターフェースを定義（HTMLImageElement／HTMLVideoElement／MediaStream を保持）。
   - テクスチャスロット（例: 0 = ベース画像、1 = カメラ）を列挙し、どの slot にどの source を割り当てるか管理する構造を決める。
2. **WebGL リソース管理レイヤー**
   - `src/render/webgl/textureManager.ts`（新規）を作成し、`WebGLTexture` の生成・更新・破棄を抽象化。
   - `webglRenderer` にテクスチャ初期化／更新処理を追加し、描画前に有効な `TextureSource` を slot ごとに `texImage2D`／`texSubImage2D` でアップロード。Video/camera の場合は `readyState` をチェックして差分更新。
   - テクスチャパラメータ（フィルタ、ラップ、色空間）を決定し、今後の拡張に備えてユーティリティ化。
3. **シェーダ更新**
   - `geodesic.frag` に複数サンプラー uniform（例: `uniform sampler2D uTextures[MAX_TEXTURES]; uniform bool uTextureEnabled[MAX_TEXTURES];`）を定義。
   - 既存のライン描画ロジックは保持しつつ、テクスチャは別経路で利用できるようにする。合成は後続タスクで扱うため、現時点では `uTextureEnabled[i]` が true の場合にサンプリング結果を渡す土台のみ実装。
   - UV 計算用 uniform（オフセット・スケール・回転）を追加し、CPU 側で柔軟に制御できるようにする。
4. **UI/入出力整備**
   - `src/ui/components/texture/TexturePicker.tsx`（新規）でユーザーが画像ファイルを選択し、`TextureSource` として登録できるコンポーネントを実装。
   - `src/ui/components/texture/CameraInput.tsx`（新規）で `navigator.mediaDevices.getUserMedia` を利用し、ユーザー許可後に MediaStream を取得して `TextureSource` に紐づける。カメラのアスペクト比・解像度は `MediaStreamTrack.getSettings()` から取得して UV 設定へ反映。
   - プリセット画像用に `src/assets/textures/` 配下へサンプルを配置し、UI から選択可能にする。
5. **Scene/Engine 連携**
   - `RenderScene` を組み立てる層（例: `src/render/engine.ts`）でテクスチャスロットを受け取り、レンダラに渡す。
   - `TextureSource` の状態管理（ロード完了、エラー、MediaStream 解放）を React state で保持し、`useEffect` などでライフサイクルを制御。
6. **テスト/検証**
   - `texImage2D` 呼び出し部分は抽象化した関数に切り出し、Vitest でモック検証。
   - Storybook に画像テクスチャ／カメラ接続フローを紹介する Docs ページと Controls、play function を追加。
   - カメラ検証は手動になるため、`README` または Storybook Docs に手順を記載。
7. **ドキュメント整備**
   - `README.md` の「開発者向け」セクションにテクスチャ入力の使い方、カメラ許可フロー、HTTPS 必須などの注意点を記載。
   - WebGL リソース解放（`dispose`）にテクスチャ解放処理を追加し、コードコメントで明示。

## 新規作成予定モジュール/ファイル
- `src/render/webgl/textureManager.ts`
- `src/render/webgl/textures.ts`（slot 定義・ユーティリティ）
- `src/ui/components/texture/TexturePicker.tsx`
- `src/ui/components/texture/CameraInput.tsx`
- `src/ui/hooks/useTextureSource.ts`（TextureSource ライフサイクル管理用）
- `src/assets/textures/`（プリセット画像格納ディレクトリ）
- `tests/unit/render/textureManager.test.ts`
- `tests/unit/ui/texturePicker.test.tsx`

## リスク・考慮事項
- Video/カメラテクスチャはブラウザのセキュリティ要件（HTTPS、ユーザー操作必須）に依存するため、許可ダイアログをキャンセルした際のフォールバックやエラー表示が必要。
- WebGL のテクスチャアップロードはメインスレッド同期コストがあるため、動画フレーム更新頻度を制御（`requestAnimationFrame` 内の更新に限定）する工夫を検討。
- MediaStream の停止忘れによるバッテリー消費やカメラ LED 点灯が起きないよう、`dispose`／コンポーネント unmount 時にストップ処理を徹底。

## 不明点（確認済み）
1. **合成方針**: 現段階ではシェーダの合成ロジックは変更せず、複数テクスチャを uniform として渡せる基盤を用意する。実際の合成処理は後続タスクで扱う。
2. **ソース取得**: ユーザーがアプリ内で画像ファイルやプリセットを選択。カメラはユーザーのカメラデバイスに許可を求めて接続。
3. **カメラ設定**: カメラデバイスから `MediaStreamTrack.getSettings()` 等でアスペクト比・解像度を取得し、UV 設定に反映する。

---
追加の要望や制約があればフィードバックをお願いします。

## 実装報告（2025-10-03）
- WebGL レイヤーに `TextureManager` とテクスチャスロット定義を追加し、静的画像と動画/カメラのアップロード・破棄を一元管理できるようにした。
- フラグメントシェーダと `webglRenderer` を拡張し、テクスチャユニフォーム群（有効フラグ、UV 変換、透過率）を使用して背景テクスチャとジオデシック描画を同時合成できる基盤を整備した。
- `RenderScene`／`RenderEngine` にテクスチャメタデータを伝搬させる経路を追加し、UI 側から渡されたレイヤー情報を WebGL に連結できるようにした。
- 画像選択・プリセット・カメラ許可を扱う `useTextureInput` フックと UI コンポーネント（`TexturePicker` / `CameraInput`）を実装し、左ペインからテクスチャ設定を操作できるようにした。
- Vitest でテクスチャ管理・UI ハンドラの単体テストを追加し、Storybook (`Controls/Texture Input`) で手順と状態を確認できるドキュメントを用意した。
- README の Texture Input セクションを更新し、HTTPS 必須などの注意点と操作フローを明記した。
