# 開発フロー（SSOT 連携版）

> この文書は「人＋AI」が同じ手順で開発を進めるための **SOP（Playbook）** です。  
> 生成ルールや出力スキーマは **マスタープロンプト** 側に集約し、本書からリンクします。

---

## 0. 前提・約束（Invariant）

- **1 PR : 1 Issue**（主役だけ `Closes #`、補助は `Refs #`）
- **粒度**：1 Issue = 30–90 分。超える場合は分割 or 残件を新 Issue 化  
- **依存**：`Blocked by` が解消されるまで着手禁止  
- **品質ゲート**：Biome / TypeScript `strict` / Vitest + coverage v8 + fast-check を必ず通す  
- **構成変更（lint/tsconfig 等）** は別 PR で先に通す  
- **生成物**（ドラフトやメモ）は **.gitignore**。レビュー目的で一時コミット可だが **main には残さない**

---

## 1. 役割

- **Playbook（本書）**：手順・判断基準・コマンドの正本  
- **マスタープロンプト（2 種）**：  
  1) **起票用** → タスクリストから Issue 案を生成 → ユーザー承認後に Issue 起票  
     - `ops/ai/prompts/v1/master_issue.md`  
  2) **実装用** → 起票済み Issue から ブランチ→実装→PR→レビュー依頼  
     - `ops/ai/prompts/v1/implement_issue.md`

---

## 2. 準備（初回/都度）

```bash
git fetch --all --prune
git switch main && git pull --rebase
pnpm i
```

- Projects（任意）：`Priority`（Single select）と `Order`（Number）を用意しておくと優先順位づけが楽。

---

## 3. タスク起票（必要なときだけ）

1) **材料を用意**：実現したい機能を箇条書きにする（最大 10 件）  
2) **マスタープロンプト（起票用）**で Issue 草案を生成  
   - → `ops/ai/prompts/v1/master_issue.md` を使用  
   - 出力はユーザー合意用の Issue 案リスト（Markdown）
3) **レビュー→起票**  
   - 草案をユーザーへ共有し、フィードバックを反映  
   - 承認後に GitHub Issue を起票（テンプレに貼り付けて登録）  
   - 起票時はテンプレートの見出し・チェックリスト等のスタイリングを崩さないこと  
   - 親子付け：Issue 起票時に Epic/Parent を指定

> Issue 起票前に必ずユーザーの承認を得ること。

---

## 4. 着手 Issue の選定ルール

1. Epic 本文の **Sequence（推奨順）** があれば順守  
2. `Blocked by` が **無い** こと（依存があれば後回し）  
3. Projects の **Order** 昇順（無ければ作成日昇順）

> 迷ったら **AI に候補 3 件を提示させ、上記ルールで 1 件に確定**。

---

## 5. 実装（起票済み Issue を進める）

> **マスタープロンプト（実装用）**で、以下を自動実行させてもよい  
> → `ops/ai/prompts/v1/implement_issue.md`

1) **Issue 確認**  
   - 目的 / In-Out / DoD / テスト観点 を読み取り、欠落があれば **コメントで提案** → 合意後に本文更新  
2) **ブランチ作成**（1 Issue = 1 branch）  
   - `git switch -c {feat|fix|chore}/{#}-{slug}`  
   - `git push -u origin HEAD`  
3) **TDD で実装**  
   - 最小の失敗テスト → 実装 → 緑化  
   - 小さくコミット（Conventional Commits、`Refs #<id>`）  
   - コミットメッセージは英語にする
   - `pnpm run lint && pnpm typecheck && pnpm test` を都度通す
   - `pnpm run format` で都度フォーマット（import 並び替え/整形を含む）
4) **PR 作成**（Draft 可）  
   - `gh pr create -B main -H $(git branch --show-current) -t "<短いタイトル>" -b $'Closes #<id>

<テンプレに沿って本文>'`  
   - Reviewer 指定：`gh pr edit <PRNUM> -r <user1,user2>`  
   - CI 緑化後に Draft 解除  
5) **仕上げ**  
   - PR テンプレのチェックを全て満たす（スクショ/ログ/手順）  
   - 残件があれば **新 Issue** を起票し、Epic/Parent に紐付け

---

## 6. PR テンプレ・Issue テンプレ

- PR（共通）：`.github/PULL_REQUEST_TEMPLATE.md`  
- PR（バグ修正）：`.github/PULL_REQUEST_TEMPLATE/bugfix.md`  
- Issue（タスク/Epic など）：`.github/ISSUE_TEMPLATE/*`

> AI はテンプレ見出しを**削除しない**。`Closes #` は主役だけ、補助は `Refs #`。PR/Issue 作成時はいずれもテンプレートのスタイリングを崩さない。

---

## 7. 自動化（任意）

- **Projects 追加**：`actions/add-to-project` or GraphQL  
- **ラベル自動付与**：`labeler` Action（`type:*` / `area:*`）  
- **優先度ミラー**：Project の `Priority` を `prio:P0` ラベルへ同期（Webhook/Actions）

---

## 9. 埋め込み(Embed)モードのオーバーレイ UI 実装ガイド

### 9-1. SceneLayout への組み込み
- `SceneLayout` は `overlay` プロパティを受け取り、`embed` モード時にキャンバス上へオーバーレイを重ねられる。
- オーバーレイ容器は `position: absolute` で右上配置。レスポンシブ調整を行う場合は共通 CSS でスタイルを制御する。
- 基本構造（2025-10-13 時点）: `src/ui/scenes/layouts.tsx` → `EMBED_OVERLAY_STYLE` を参照。

### 9-2. シーン側の拡張ポイント
- `SceneDefinition` に `embedOverlayFactory?: (context) => ReactNode` を追加済み。必要であればシーン専用 UI を生成できる。
- デフォルトでは各 Host コンポーネントが共通オーバーレイを提供する。カスタマイズしたい場合は `sceneDefinitions.tsx` で factory を指定し、`context.controls` にデフォルト UI が渡される。
- context には `scene`, `renderBackend`, `controls`, 任意の `extras` が含まれる。Euclidean ホストではハンドル表示状態とトグル関数が extras に含まれる。

### 9-3. 共通コンポーネント
- `EmbedOverlayPanel` (`src/ui/components/EmbedOverlayPanel.tsx`) はタイトル・サブタイトル・ボディを整形する共通ラッパー。Embed UI はこれを活用して一貫性を保つ。
- ハンドルの表示切替などボタン操作を追加する際は、タップ領域と配色が埋め込み背景と馴染むよう `rgba(15,23,42,α)` を基調に設定する。

### 9-4. テスト観点
- `tests/unit/ui/sceneLayout.embed.test.tsx`: オーバーレイが `embed` 真偽値に応じて表示/非表示になることを検証。
- `tests/unit/ui/scenes/sceneDefinitions.embed.test.tsx`: `embedOverlayFactory` がデフォルト UI を引き継ぎつつ追加要素を挿入できることを確認。
- 新しいシーンで独自オーバーレイを追加する場合は同様のユニットテストを用意し、factory の挙動を固定化する。

### 9-5. 実装フローの目安
1. `SceneLayout` に必要なスタイル調整を加える（レスポンシブ挙動が必要ならクラス化も検討）。
2. Host コンポーネントで `overlay` を生成。デフォルト UI → `scene.embedOverlayFactory` の順に適用。
3. シーン定義へ factory を追加し、共通 UI をカスタマイズ。必要なハンドラは `extras` 経由で渡す。
4. テストで DOM 構造とカスタマイズ結果を検証。
5. Storybook や実アプリの embed 表示で視覚的な最終確認を行う。

---

## 8. 週次 10 分の棚卸し

- 未着手：本文を整備／過大なら分割  
- 進行中：コメントにログ、PR にスクショ/確認手順  
- 完了：Close、Epic/リリースノートに反映、Project の Status/Order を更新


## 参照（SSOT）

- **起票用マスタープロンプト**：[`../prompts/v1/master_issue.md`](../prompts/v1/master_issue.md)  
- **実装用マスタープロンプト**：[`../prompts/v1/implement_issue.md`](../prompts/v1/implement_issue.md)  
- **親子付け**：[`../../scripts/issues/issue_deps.sh`](../../scripts/issues/issue-deps.sh)  
- **PR テンプレ**：[`../../.github/PULL_REQUEST_TEMPLATE/feature.md`](../../.github/PULL_REQUEST_TEMPLATE/feature.md)  
- **Bugfix PR テンプレ**：[`../../.github/PULL_REQUEST_TEMPLATE/bugfix.md`](../../.github/PULL_REQUEST_TEMPLATE/bugfix.md)
