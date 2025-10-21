# SceneHost embed 共通化計画（2025-10-19）

## 目的
- Hyperbolic / Euclidean / Spherical の各 SceneHost で分散している embed オーバーレイ処理を共通化し、仕様差異を解消する。
- EmbedOverlayPanel の既定生成や StageCanvas の描画レイアウトを統一し、変更容易性と保守性を高める。

## スコープ
- 対象: `SceneLayout`、`SceneHost`（Hyperbolic / Euclidean / Spherical）、`SceneDefinition` の embed 関連 API。
- 非対象: 個別シーン固有のコントロール（例: ハイパーボリック反射スライダー、ユニットディスクハンドル表示ロジック）のリファクタリング。

## 現状整理
- SceneHost ごとに `scene.embedOverlayDefaultVisible` / `scene.embedOverlayFactory` の扱いが異なり、フォールバック UI が Hyperbolic のみに存在しない。
- StageCanvas のスタイル宣言や `overlay` の配置が各ファイルに重複しており、embed 以外のレイアウトにも影響が出る恐れがある。
- `SceneLayout` は embed でのみ overlay を表示する前提になっており、Host 側で `embed` を意識した条件分岐が重複する。

## 課題
- EmbedOverlayPanel の生成条件がバラバラで、仕様変更時に 3 ファイルを同時修正する必要がある。
- `SceneEmbedOverlayContext` の `controls` / `extras` の型が曖昧で、共通化用ヘルパーの導入を阻害している。
- StageCanvas のスタイル差異により、Host 毎の DOM 構造がわずかにずれている。

## 方針
1. 共通ヘルパー導入  
   - `useSceneEmbedOverlay`（仮）を `SceneLayout` 近傍に作成し、`SceneDefinition` と Host 固有の `renderBackend` / `extras` を受け取って overlay を解決。
   - EmbedOverlayPanel の標準ラッパー `createDefaultEmbedOverlay(sceneLabel, children?)` を追加し、Hyperbolic でも同一 UI を提供。
2. Layout 改修  
   - `SceneLayout` に非 embed 時の overlay 表示位置を内包し、Host 側の条件分岐を削除。
   - StageCanvas で共有するスタイル定数を導入し、各 Host の JSX を簡素化。
3. 型整備  
   - `SceneEmbedOverlayContext` の `extras` に型ガードまたはジェネリクス導入を検討し、Hyperbolic 反射設定などを安全に扱えるようにする。

## タスク分解
1. `SceneEmbedOverlayContext` の調査と型設計（`src/ui/scenes/types.ts`）  
   - extras の構造を洗い出し、共通ヘルパーで扱える形に調整。
2. 共通ヘルパー実装（`src/ui/scenes/layouts.tsx` or 付近）  
   - `useSceneEmbedOverlay` と `createDefaultEmbedOverlay` を追加し、既存 Host からロジックを移植。
3. SceneHost 側の置換  
   - Hyperbolic / Euclidean / Spherical Host で個別 `useMemo` を削除し、ヘルパー呼び出しに差し替え。
   - StageCanvas の共通スタイル常数を適用。
4. テスト整備  
   - `tests/unit/ui/sceneLayout.embed.test.tsx` を更新し、共通化後も embed/非 embed で期待通り表示されるか確認。
   - Host 個別のユニットテスト（必要に応じて）で overlay の有無を検証。
5. ドキュメント更新  
   - `plan/overlay-defaults.md` との整合を取り、仕様変更点を README / Docs に追記する必要があるか確認。

## 追加で検討する共通化ポイント
- `controlsFactory` ラッパー  
  - 各 Host が `scene.controlsFactory?.({ scene, renderBackend, defaultControls, extras }) ?? defaultControls` を繰り返しているため、`resolveSceneControls` ヘルパーを追加し統一する。
  - extras の型整理と合わせて、Host ごとの defaultControls 構築に注力できる形へ移行。
- `StageCanvas` 構成  
  - 3 Host で共通する `StageCanvas` のスタイル（full width/height, border none）と基礎イベントバインドを `SceneLayout` 側へ抽出し、Host ではハンドラー差分のみを指定できるようにする。
  - embed/unembedded 双方で overlay を `SceneLayout` が責務として扱うよう整理し、DOM 構造の差異を排除。
- Embed 状態トラッキング  
  - 各 Host で `embed` フラグによる条件分岐が重複している。共通フック内で `embed` に応じた overlay/controls 切り替えを行うことで、Host 側から条件式を取り除く。
- 反復している Storybook/テスト  
  - `tests/unit/ui/sceneLayout.embed.test.tsx` 以外に、Host 別テストで overlay の存在をアサートしており、将来的には共通ヘルパー向けのテストに寄せて冗長さを削減する。

## 期待される効果
- Embed オーバーレイ仕様を 1 箇所で定義でき、将来的な UX 調整が容易になる。
- Hyperbolic シーンでも EmbedOverlayPanel が提供され、他モードとの操作体験が揃う。
- `controls`/`overlay` の生成ロジックが共通化されることで、SceneHost の JSX が薄くなり保守コストを低減。
- JSX の重複削減と型補強により、バグ混入リスクとレビューコストを低減。
