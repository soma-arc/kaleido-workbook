# v1 Hyperbolic “Escher” Scene — Planning Notes

## 0. 目的 / コンセプト
- ハイパーボリック区分の新シーン “Escher” を追加し、Circle Limit 系のパターンを再現する。
- オーバーレイ UI から 4 つの (p,q,r) プリセットを即時切り替えできるようにする。
- 既存計画 (`plan/triangle-continuous-design.md`, `plan/codex-hyperbolic-triangle-geodesics.md`) と整合し、連続的な描画と測地線表現を流用する。

## 1. 未確定事項（要ユーザー確認）
- 追加で必要になる Circle Limit パターン（現時点では (2,6,4), (2,8,3) の 2 種）
- Escher シリーズごとの色味 / テクスチャ プリセットの要否
- 基本反射回数・描画深度の既定値
- オーバーレイ UI のレイアウト（単純なボタン群か、プレビュー付きコントロールか）

## 2. 仕様同期（Playbook §1）
- Issue / SSOT の確定後、Scene 定義・DoD を本計画ファイルへ反映。
- 依存 Issue が無いことを Project / GitHub Issue で確認。

## 3. ブランチ準備（Playbook §2）
- `git fetch --all --prune` → `git switch main && git pull --rebase` → `pnpm i`
- ブランチ命名: `feat/<issue#>-escher-scene`
- ベース状態の `pnpm biome:check`, `pnpm typecheck`, `pnpm test` が緑であることを確認。

## 4. 実装タスク（Playbook §3〜§6）
1. **Scene 定義**
   - `src/scenes/hyperbolic/escher/`（仮）に definition / ui / stories を新設。
   - `sceneDefinitions.tsx` に `hyperbolicEscherScene` を登録、`SCENE_IDS` へ alias を追加。
   - `SceneDefinition` では label/description を設定せず、`supportsPanZoom`, `renderPipelineId` 等と `embedOverlayDefaultVisible = true` の指定のみ行う。
2. **オーバーレイ UI**
   - (2,6,4) と (2,8,3) の 2 プリセットをトグルできるシンプルなボタン UI を `EmbedOverlayPanel` ベースで実装。
   - 選択状態の保持と `useHyperbolicTriangleState` / `useTriangleParams` との連携を確認。
3. **レンダリング**
   - `hyperbolicTripleReflection.frag` をコピーし Escher 専用シェーダ（例: `hyperbolicEscher.frag`）を作成。
   - Triple Reflection パイプラインをベースに新パイプライン ID を登録し、Escher シーンと紐付ける。
   - 手描き入力用に Canvas 2D を新設し、ユーザーのストロークをこのキャンバスへ描画。
   - 描画内容を WebGL テクスチャへ同期し、Escher シーン専用シェーダで既存タイルの上に重ね合わせる。
   - UI 上では WebGL キャンバスの上に手描きキャンバスをオーバーレイし、リアルタイムに更新されるようにする。
4. **ジオメトリ / データ**
   - プリセット定義・初期値・補助ユーティリティなどシーン固有のコードは `src/scenes/hyperbolic/escher/` 配下に閉じ込め、他シーンへ漏れない構成にする。
   - 既存ユーティリティ（`buildTiling`, `buildHyperbolicTriangle` など）をラップする場合も Escher シーン専用モジュール上で扱う。
5. **UI 統合**
   - `HyperbolicSceneHost` へ新シーンが表示されるよう `useSceneRegistry` の定義を更新。
   - embed モードでオーバーレイが表示されることを確認。

## 5. テスト / Story（Playbook §7, §8）
- Unit: シーン登録、プリセット切替ロジック、Uniform 変換の保証。
- fast-check: (必要であれば) プリセット切替でハイパーボリック条件が保たれること。
- Storybook CSF3: Escher シーンの Controls/Docs/Play/アクセシビリティを整備。
- Storybook Play ではプリセットボタンをクリックし、Canvas の描画更新を検証。

## 6. ドキュメント（Playbook §9）
- 新シーンの概要を README もしくは docs に追記（Circle Limit との対応、使用方法、既知制約）。
- 計画書の更新があればバージョン付けして差分を明示。

## 7. チェックリスト（Playbook §10, §11）
- [ ] `pnpm biome:check`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] Storybook Play 実行結果を記録
- [ ] README/docs 更新
- [ ] 残件は新 Issue として切り出し `Refs #` で紐付け

> 詳細仕様（プリセット内容や彩色ルール）はユーザー指示を待って追記すること。
