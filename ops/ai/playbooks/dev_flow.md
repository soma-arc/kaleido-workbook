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
- **生成物**（`ops/out/*.ndjson`）は **.gitignore**。レビュー目的で一時コミット可だが **main には残さない**

---

## 1. 役割

- **Playbook（本書）**：手順・判断基準・コマンドの正本  
- **マスタープロンプト（2 種）**：  
  1) **起票用** → タスクリストから NDJSON を生成 → Issue 起票  
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
2) **マスタープロンプト（起票用）**で **NDJSON** を生成  
   - → `ops/ai/prompts/v1/master_issue.md` を使用  
3) **レビュー→適用**  
   - レビュー（PR で `ops/out/issues-YYYYMMDD.ndjson` を確認）  
   - 起票：`scripts/issues/apply_ndjson.sh ops/out/issues-YYYYMMDD.ndjson`  
   - 親子付け（任意）：`scripts/issues/link_subissues.sh ops/out/... "Epic: ..."`  
   - **適用後に out を削除**（main に残さない）

> 生成物は常に **NDJSON**。スキーマはマスタープロンプトの出力規約に従う。

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
   - `pnpm biome:check && pnpm typecheck && pnpm test` を都度通す  
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

> AI はテンプレ見出しを**削除しない**。`Closes #` は主役だけ、補助は `Refs #`。

---

## 7. 自動化（任意）

- **Projects 追加**：`actions/add-to-project` or GraphQL  
- **ラベル自動付与**：`labeler` Action（`type:*` / `area:*`）  
- **優先度ミラー**：Project の `Priority` を `prio:P0` ラベルへ同期（Webhook/Actions）

---

## 8. 週次 10 分の棚卸し

- 未着手：本文を整備／過大なら分割  
- 進行中：コメントにログ、PR にスクショ/確認手順  
- 完了：Close、Epic/リリースノートに反映、Project の Status/Order を更新

---

## 付録：よく使うコマンド

```bash
# Issue 作成（NDJSON 適用）
bash scripts/issues/apply_ndjson.sh ops/out/issues.ndjson

# 親子(Sub-issues) の付与（親=Epicタイトル）
bash scripts/issues/link_subissues.sh ops/out/issues.ndjson "Epic: v0.1 ..."

# PR 作成（テンプレは自動適用）
gh pr create -B main -H $(git branch --show-current) -t "feat: ..." -b $'Closes #123

<本文>'

# 依存関係の付与（例：#123 を #456 がブロック）
bid=$(gh api repos/OWNER/REPO/issues/456 --jq .id)
gh api -X POST repos/OWNER/REPO/issues/123/dependencies/blocked_by -f issue_id="$bid"
```

---

## 参照（SSOT）

- **起票用マスタープロンプト**：[`../prompts/v1/master_issue.md`](../prompts/v1/master_issue.md)  
- **実装用マスタープロンプト**：[`../prompts/v1/implement_issue.md`](../prompts/v1/implement_issue.md)  
- **起票スクリプト**：[`../../scripts/issues/apply_ndjson.sh`](../../scripts/issues/apply_ndjson.sh)  
- **親子付け**：[`../../scripts/issues/link_subissues.sh`](../../scripts/issues/link_subissues.sh)  
- **PR テンプレ**：[`../../.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)  
- **Bugfix PR テンプレ**：[`../../.github/PULL_REQUEST_TEMPLATE/bugfix.md`](../../.github/PULL_REQUEST_TEMPLATE/bugfix.md)
