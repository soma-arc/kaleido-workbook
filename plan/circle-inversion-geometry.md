# Issue #152: Euclidean Circle Inversion 拡張計画

## 目的
- `euclidean-circle-inversion` シーンに、2 ハンドルで操作できる直線を追加し、ユーザーが円反転の基準線を調整できるようにする。
- 上記直線の円反転像を同シーン上に描画し、反転結果の可視化を行う。
- テクスチャ対応矩形を配置し、その円反転像（テクスチャ付き）も表示することで、反転の効果を分かりやすく提示する。

## 現状整理
- `euclidean-circle-inversion` シーンは円反転の挙動を可視化するが、直線やテクスチャ矩形の操作対象は未実装。
- ハンドル付きオブジェクトは他シーンで実装済みであり、`StageCanvas` 上の 2D オーバーレイで操作できる仕組みがある。
- 円反転ロジックは既存のジオメトリ／ユーティリティにより、点や線の反転計算が可能と推測。
- テクスチャ矩形は plan/mirror-scene.md の計画と同様、テクスチャ有無に応じた描画が必要。

## 方針
- Issue #152 の依存（Blocked by）が無いことを GitHub 側で確認したうえで着手し、範囲外タスクは別 Issue 候補として整理する。
- 円反転シーンの状態モデルを拡張し、固定円・基準直線・テクスチャ矩形・描画トグルを `CircleInversionState` とシーン定義（`sceneDefinitions.tsx`）に集約。`supportsHandles` を有効化し、既存のハンドル制御（`controlAssignments`）で直線端点を管理する。
- 直線↔円の反転や矩形頂点反転を `src/geom/transforms/inversion.ts` にユーティリティとして切り出し、数値テストで保証した上で UI 層から利用する。
- WebGL パイプライン（`euclideanCircleInversionPipeline.ts` と fragment シェーダ）を、拡張された state/uniform を元に描画できるよう改修し、矩形テクスチャは `textureManager` 系ユーティリティと整合させる。
- `EuclideanSceneHost`／Storybook を更新し、ハンドル操作・表示トグル・状態 readout を UI で確認できるようにする。

## 実装ステップ案
0. **事前確認**
   - `gh issue view 152 --json state,trackedIssues` などで Blocked by が存在しないことを確認。あれば解消待ち or 調整案をコメント。
   - `pnpm i` / `pnpm test` / `pnpm biome:check` を実行し、現状が Green であることを把握。
1. **状態モデル拡張**
   - `src/ui/scenes/circleInversionConfig.ts` の `CircleInversionState` を、基準直線（ハンドル ID 2 点）、表示トグル、テクスチャ設定を持てる構造へ拡張。
   - `sceneDefinitions.tsx` で `supportsHandles: true` とし、`controlAssignments` を設定して固定ハンドル ID（例: `line-fixed`, `line-free`）を共有。初期 state を更新。
   - `EuclideanSceneHost.tsx` で新属性を受け取り、ハンドル変更時に `CircleInversionState` を更新できるようコールバックを追加。状態 readout（`data-testid="circle-inversion-state"`）も拡張。✅ 実装済み（ハンドル変化で `updateCircleInversionLineFromControls` を利用、トグルヘルパーも導入済み）
2. **ジオメトリユーティリティ**
   - `src/geom/transforms/inversion.ts` に「直線を円反転した結果の円 or 直線」を返す関数や、ハンドル座標から法線・距離を導出する関数を追加。既存の `invertInCircle` を再利用し、退化ケース（直線が中心を通る等）も扱う。
   - 新関数用のユニットテストを `tests/unit/geom/inversion.unit.test.ts` に追加し、対称性や involution を検証。必要に応じプロパティテストを `tests/property` に配置。✅ `invertLineInCircle` の単体テスト追加済み。
3. **WebGL パイプライン改修**
   - `render/scene.ts`／`render/engine.ts` の `CircleInversionState` 取り回しを更新し、拡張パラメータ（反転直線の円パラメータ、テクスチャ矩形、表示トグル等）を WebGL 層へ引き渡す。✅ runtime/config 双方で secondary rectangle を含む state を渡すよう更新済み。
   - `render/webgl/pipelines/euclideanCircleInversionPipeline.ts` で新 uniform を解決し、シェーダに固定円・基準直線・テクスチャ矩形・テクスチャリソースを渡せるようにする。矩形自体の反転はシェーダに任せる。✅ 二つ目の矩形および表示トグルに対応。
   - fragment シェーダ `euclideanCircleInversion.frag` にライン描画・テクスチャサンプリングの分岐を実装し、渡された矩形仕様とテクスチャから反転像を計算させる。✅ 第二矩形の描画・反転も対応。
   - ✅ デフォルトの cat_fish_run テクスチャをロードし、テクスチャ有無の切替が機能することを確認。
4. **UI/Storybook 更新**
   - `EuclideanSceneHost` のサイドパネル or overlay に表示トグル（直線ハンドル、反転像、テクスチャ）を追加し、`HalfPlaneOverlayControls` と整合。✅ primary/secondary 矩形・ライン・テクスチャのトグルを追加済み。
   - Storybook (`CircleInversionScene.stories.tsx`) の Docs/Controls/Play を拡張し、ハンドル可動・固定時の挙動を Play テストで検証。✅ Play テストで表示トグル・テクスチャの反映を確認。
   - `storybook.md` に沿って CSF3 の controls（トグル等）と accessibility 設定を更新。✅ label 付きコントロールを追加。
5. **回帰と仕上げ**
   - `pnpm biome:check` / `pnpm typecheck` / `pnpm test` を通し、結果を PR テンプレに記録。✅ `pnpm test` 実行済み（全テスト Green）。
   - ドキュメントや README に追記が必要ならまとめ、残課題を Issue として起票（例: 複数オブジェクトへの拡張）。🚧 未確認。

### 再開メモ（Next）
- セカンダリ矩形用のカラー／フェザー値を Storybook から可変指定できるようにする（必要なら `display` 拡張）。
- WebGL パイプラインの単体テストに第二矩形 uniform の検証ケースを追加。
- フォローアップとしてテクスチャ無効時の描画パフォーマンス最適化（lazy uniform 更新など）を検討。

## テスト観点
- **ユニット**: 直線→円／直線の反転結果、involution（2回反転で元に戻る）、中心通過の退化ケースを `tests/unit/geom/inversion.unit.test.ts` で網羅。
- **プロパティ**: fast-check を用い、直線の任意位置・向きに対する反転結果が長さ積一定など既知の性質を満たすことを `tests/property` に追加。
- **UI/VRT**: Storybook Play でハンドルが固定時は動かない／自由端は動かせる、トグル操作で描画ON/OFFが反映されることを確認。
- **レンダリング**: WebGL パイプラインのユニフォームが設定されることを `tests/unit/render/webgl/pipelineRegistry.test.ts` 付近に追加し、矩形テクスチャ・反転ラインの ON/OFF が反映されることを検証。
- **アクセシビリティ**: Storybook accessibility アドオンで主要 interactive 要素がフォーカス可能で aria-label が適切に付与されているか確認。

## 残課題・フォローアップ候補
- テクスチャ反転の高精度マッピング（シェーダでの非線形テクスチャ座標補間）。
- 複数の直線／複数の図形に対応する拡張。
- Hyperbolic シーンへの類似機能展開。

## 確認メモ
- テクスチャ＆直線の反転描画はシェーダ内でサンプル点を円反転し、領域内判定の上で色決定する。
- 直線ハンドルの移動範囲に特別な制限は不要。
