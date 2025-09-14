---
name: "Feature PR"
about: 新機能・改善の実装 PR テンプレート
title: "feat: <短く具体的なタイトル>"
labels: ["type:feature"]
---

<!--
記入ルール（要点）
- PR タイトルは Conventional Commits（feat: / fix: / chore: / refactor: など）
- 本文先頭に必ず `Closes #<id>`（主役 Issue を 1 つ）。関連は `Refs #<id>`
- 受け入れ基準（DoD）で誰でも合否判定できるよう具体に（曖昧語NG）
- コマンドは実行可能な形で記載（pnpm / gh / bash）
-->

Closes #<id>

## 目的（Why）
- 背景/課題: {誰が何に困っているかを1–2行で}
- 目標: {このPRでユーザー/開発者が何をできるようになるか}

## 変更点（What）
- {主要な変更1}
- {主要な変更2}
- {非機能: パフォーマンス/アクセシビリティ/可読性 など}

### 技術詳細（How）
- 設計/アルゴリズムの要点
- 代替案の検討（採用しなかった理由があれば）

## スクリーンショット / 動作デモ（任意）
<!-- スクショ/動画 or Storybook の該当 Story へのリンクを貼る -->

## 受け入れ条件（DoD）
- [ ] 目的を満たすユーザーストーリーが確認できる
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm run test:sandbox` が緑（coverage v8）
- [ ] 重要分岐のユニット/プロパティテストが追加されている
- [ ] README/Docs/Storybook（該当時）が更新されている
- [ ] アクセシビリティ: ラベル/フォーカス/キーボードが機能し重大違反なし

## 確認手順（Reviewer 向け）
```bash
pnpm i
pnpm lint && pnpm typecheck && pnpm run test:sandbox
# 開発サーバ（必要時）
pnpm dev
```

## リスクとロールバック
- 影響範囲: {モジュール/機能名}
- リスク/懸念: {既知の課題・トレードオフ}
- ロールバック指針: {切り戻し手順 or フラグ無効化手段}

## Out of Scope（別PR）
- {今回やらないこと}

## 関連 Issue / PR
- Refs #<id>
- Blocked by #<id> / Blocks #<id>

## 追加メモ（任意）
- プロジェクト連携: 必要なら Project の Priority/Order 更新
- リリースノート案: {ユーザー向け1行}
