# マウスパン・ズーム計画（Issue #151）

## 背景
- 現状の StageCanvas はポインタイベントを SceneHost ごとに個別実装しており、パン・ズーム用の共通レイヤが存在しない。
- ハンドルやテクスチャ矩形など既存のドラッグ操作と競合しない形で、キャンバス全体のビューポート操作を提供する必要がある。

## 目標
- マウスドラッグでの平行移動、ホイールによるズームを `supportsPanZoom=true` なシーンで利用可能にする。
- 共通フック（仮称 `usePanZoomState`）で viewport の `scale/tx/ty` とリセット API を管理する。
- StageCanvas またはホスト層でドラッグ／ホイール入力をフックし、ハンドル・オーバーレイ操作と排他制御する。
- `supportsPanZoom=false` のシーンでは既存動作を維持する。

## 必要な仕様（要確認）
- ズーム係数（ホイール1ノッチあたりの倍率変化）。
- ズームのクリッピング範囲（最小/最大スケール）。
- パンの制限（境界外の移動許容範囲）。
- モディファイアキー（例: Shift+ドラッグ）によるモード切り替え要否。
- タッチデバイス対応の優先度。

## 実装アウトライン
1. `SceneDefinition` に `supportsPanZoom?: boolean` を追加し、対象シーンで true を設定。
2. `src/ui/hooks/usePanZoomState.ts`（新規）
   - `offset`（tx, ty）と `scale` を保持する reducer。
   - `panBy(dx, dy)`, `zoom(focus, delta)` などの API。
   - `reset()` で初期値へ戻す。
3. `StageCanvas` へパン・ズームのイベント層を注入
   - pointerdown でハンドルヒット判定を行い、ヒットしない場合のみパン開始。
   - ホイールイベントでズーム、focus 点はスクリーン座標から viewport へ変換して適用。
   - pointer capture を利用し、操作終了でクリア。
4. Render パイプライン連携
   - `render/engine.ts` に viewport override を渡し、`compose(panZoomViewport, computedViewport)` を利用してスクリーン再描画。
   - Euclidean/Hyperbolic の両方で正しく動作するよう geometry レイヤを検証。
5. リセット UI
   - 既存のビューリセットボタンがなければ簡易ボタンを SceneControls に追加（Storybook 規約に従う）。

## テスト
- ユニット: `usePanZoomState` の reducer・境界処理。
- コンポーネント: `StageCanvas` もしくは SceneHost で supportsPanZoom の on/off を確認。
- Storybook: Controls/Docs/Play でパン・ズーム手順とアクセシビリティを検証。
- fast-check: ズーム後もジオメトリの基本不変量が破綻しないことの簡易プロパティ（要検討）。

## リスクとフォローアップ
- WebGL と Canvas レイヤのビューポート同期ずれ。
- ハンドル操作との競合が残る場合、優先順位ロジックの調整が必要。
- タッチ/トラックパッド対応が範囲外の場合、別 Issue で管理する。

## 依存関係
- `plan/archived/scene-host-embed-unification.md` で整理された StageCanvas 共通化戦略。
- `render/viewport.ts` の `compose`/`invert` 関数（既存）。

