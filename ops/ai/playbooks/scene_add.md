# シーン追加ガイドライン

> 新しいシーン（ハイパーボリック / ユークリッド / 球面）を追加するときの標準手順をまとめた Playbook です。  
> 実装フローは `ops/ai/prompts/v1/implement_issue.md` と `ops/ai/playbooks/dev_flow.md` を前提とします。

---

## 0. 前提チェック
- 1 PR : 1 Issue（主役だけ `Closes #`、補助は `Refs #`）。
- 作業対象ディレクトリ: `src/geom/**`, `src/render/**`, `src/ui/scenes/**`, `tests/**`, `plan/**`, `docs/**` など必要な範囲に限定する。
- TDD 方針: 失敗テスト → 実装 → リファクタリング。Vitest + fast-check + Storybook Play を通す。
- コーディング規約: 公開 API には TSDoc を付与、Biome(4 spaces) と TypeScript strict を順守。

## 1. 仕様同期
1. 既存計画書（`plan/*.md`）と対象 Issue を読み、目的 / In-Out / DoD / テスト観点を確認。
2. 未定義項目（Scene ID、交差角、Uniform 仕様など）があればユーザーに確認して計画書へ反映。
3. 依存 Issue が無いか `gh issue view` や Project を確認。

## 2. ブランチと準備
1. `git fetch --all --prune` → `git switch main && git pull --rebase` → `pnpm i`。
2. ブランチ命名: `{BRANCH_PREFIX}/{ISSUE_NUMBER}-{slug}`。
3. 作業前に `pnpm biome:check`, `pnpm typecheck`, `pnpm test` を実行しベースが緑か確認。

## 3. シーン定義の追加
1. `src/ui/scenes/sceneDefinitions.ts` に新 SceneDefinition を追加。`createSceneId` を用い、`SCENE_REGISTRY` へ自動登録される構造を維持する。
2. 下記を明記:
    - `label`, `variant`, `geometry`, `description`, `supportsHandles`, `editable`。
    - 必要な初期状態（半平面 / 円 / 球面頂点など）。
3. Scene ID を `SCENE_IDS.<alias>` へ追加し、他コンポーネントから参照できるようにする。

## 4. レンダリングパイプライン
1. WebGL を利用する場合:
    - `src/render/webgl/pipelines/` にシーン固有のパイプラインを追加。
    - `registerSceneWebGLPipeline` で Scene ID とひもづける。
    - シェーダは `src/render/webgl/shaders/` に配置し、`?raw` import を用いる。
    - Uniform は型安全に管理し、反転回数などパラメータは `renderScene` または Scene state から供給する。
2. Canvas 2D 等で実装する場合も、`render` / `dispose` API を満たすインスタンスを作成する。
3. クリッピングやビューポート計算は既存パイプライン（例: `hyperbolicGeodesicPipeline`）と整合させる。

## 5. ジオメトリ / データモデル
1. 新しいジオデシックや三角形生成が必要な場合は `src/geom/**` にユーティリティを追加。
2. バリデーションに失敗するケースでは `console.warn` で通知し、描画が継続できるようにする。
3. fast-check の性質（回転/平行移動/スケール不変など）を守るよう比較ロジックを用意。

## 6. UI への統合
1. 対象ホスト（`EuclideanSceneHost`, `HyperbolicSceneHost`, `SphericalSceneHost` など）に新シーンが選択肢として表示されるよう更新。
2. コントロールパネルに追加パラメータが必要な場合は、最小限の入力に絞り、`useSceneRegistry` との整合を保つ。
3. アクセシビリティ: Canvas の `aria-label`, フォーカス制御、固定ハンドルの表示を確認。
4. **Embed モードのオーバーレイ UI**  
   - `SceneLayout` は `overlay` プロパティを受け取り、`embed` モードではキャンバス上にカード形式の UI を重ねられる（実装は `src/ui/scenes/layouts.tsx` の `EMBED_OVERLAY_STYLE` を参照）。  
   - 既定のオーバーレイは各 SceneHost が提供する。シーン固有 UI を追加したい場合は `SceneDefinition.embedOverlayFactory` を指定し、`context.controls`（共通 UI）に要素を追加・差し替える。  
   - 共通デザインには `EmbedOverlayPanel` (`src/ui/components/EmbedOverlayPanel.tsx`) を使用し、ボタンや説明テキストをまとめる。  
   - ユニットテスト例:  
     - `tests/unit/ui/sceneLayout.embed.test.tsx` …… overlay の表示 / 非表示  
     - `tests/unit/ui/scenes/sceneDefinitions.embed.test.tsx` …… factory による拡張  
   - レスポンシブ対応が必要な場合は、`SceneLayout` 側のスタイル（または専用 CSS モジュール）でメディアクエリを設定し、幅が狭い環境ではレイアウトを縦並びに切り替える。

## 7. Storybook 整備
1. CSF3 で `stories/<SceneName>.stories.tsx` を追加/更新し、Controls / Docs / Play / Accessibility を整備。
2. Play Function では主要操作（パラメータ変更、反転回数変更、ハンドルドラッグなど）を自動検証。
3. `storybook.md` の規約（Controls, Docs, DocsPage, Play, アクセシビリティ）に従う。

## 8. テスト戦略
- **Unit / Vitest**: Scene 初期化、ユーティリティ（角度計算、Uniform 変換、警告ハンドリング）。
- **fast-check**: 幾何変換の性質（回転/並進/一様スケール）や入力順対称性を保証。
- **Storybook Play**: UI 操作 → Canvas 結果の検証。
- **Snapshot / その他**: 必要に応じて追加。ただし過剰な snapshot は避ける。

## 9. ドキュメント更新
- README や `docs/` にシーン概要、操作方法、既知の制限、Uniform の意味を追記。
- 計画書を更新した場合はバージョンや差分を記録（例: `plan/hyperbolic-triple-reflection.md v1.2`）。

## 10. チェックリスト（リリース前）
- [ ] `pnpm biome:check`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] 新シーンの Storybook Play を実行し、結果を PR に記載
- [ ] 主要ファイルに TSDoc コメントが付与されている
- [ ] README / docs 更新済み
- [ ] DoD を Issue コメントで確認し、PR テンプレをすべて埋める

## 11. 残件管理
- 共役操作や追加パラメータなど、今回の範囲を超える要望は新 Issue として切り出し、Epic/Parent に紐付ける。
- 不確定事項が発覚した場合は `plan/` または Issue コメントへ追記してチームに共有する。
