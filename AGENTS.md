# AGENTS

本プロジェクトは PoC（最小実証）として、Poincaré 円板上の「三鏡型 (p,q,r)」「ジオデシック」「角度スナップ」「群での展開」「共役操作」を最小構成で成立させることを目的とします。チーム内のロールを以下に定義し、各自の責務・完了定義（DoD）・レビュー基準を明確化します。

- タイムゾーン: Asia/Tokyo
- 原則: シンプル・小さく作り速く回す（過剰設計を避ける）
- 技術スタック: TypeScript + React + Vite + pnpm、Canvas 2D
- Linter/Formatter: Biome（インデント 4 スペース）
- テスト: Vitest（coverage provider: v8）
- CI: GitHub Actions

## 役割と責務

### TechLead
- 責務
  - 要件の優先度付け・スコープ管理（MVP死守、過剰機能は後回し）
  - システム設計の指針提示（状態管理、描画ループ、ディレクトリ構成）
  - 品質ゲート定義（型安全、Biome、Vitest+Coverage v8、GitHub Actions）と運用
  - コミット/PR ポリシーの運用（小さなコミット、pre-commit で test/lint/format を必須化）
  - レビューの最終承認、リスク管理、技術的負債の記録と返済計画
- 完了定義（DoD）
  - TODO.md に沿ったマイルストーン運用が成立
  - README のセットアップ手順で 3 分以内に起動可能
  - CI（GitHub Actions）で typecheck / biome（lint/format チェック）/ test（coverage v8）が動作
- レビュー基準
  - シンプルさと拡張余地のバランス
  - 可読性・保守性（明確な依存関係と疎結合）
  - パフォーマンス予算と測定計画の妥当性

### GeometrySME（幾何）
- 責務
  - Poincaré 円板モデル、SU(1,1) によるモビウス/反モビウス変換の定式化
  - 反射（円/直線）・ジオデシック（境界2点→境界直交円弧）の実装仕様策定
  - 角度スナップ（π/n, 90°, 接線）ロジックの数値安定設計（ε、閾値）
  - 共役 φ_{z0,θ} の仕様（パラメタ、正規化、合成則）
- 完了定義（DoD）
  - 数式・擬似コード・パラメタの妥当性がレビュー済み
  - 主要な数式の検証例（手計算or参考文献）が揃っている
- レビュー基準
  - 数値安定性（正規化、丸め、しきい値）
  - 幾何的整合性（境界直交、角度の一致、群構造の保持）

### Frontend（UI/描画）
- 責務
  - Vite + React + TS の雛形、Canvas 2D による描画エンジン
  - UI: 角度ピッカー、(p,q,r) 入力、深さスライダ、共役ハンドル（z0ドラッグ/θ回転）
  - 入力（境界上2点クリック）→ ジオデシック生成、スナップ状態の可視化
  - PNG スクリーンショット保存（任意で SVG）
- 完了定義（DoD）
  - 60fps 目標で操作が滑らか（開発マシンで体感良好）
  - キャンバス座標変換と DPI 対応（devicePixelRatio）
  - アクセシビリティ最低限（キーボード操作・コントラスト配慮）
- レビュー基準
  - UI の簡潔さ・直感性（学習コスト低）
  - 再描画最適化（領域限定、バッチ描画）

### QA/Perf（検証・性能）
- 責務
  - スモークテスト・手動シナリオの設計（受け入れ条件準拠）
  - 型チェック、Biome（lint/format, 4スペース）の整備、Vitest + coverage v8 の設定と CI 連携
  - パフォーマンス計測とカリング戦略検証（画面外/最小サイズ抑制）
  - Git hooks（pre-commit, pre-push）での自動チェック運用確認
- 完了定義（DoD）
  - CI: typecheck + biome（lint）+ test（coverage v8）が PR で自動実行
  - pre-commit で lint/format/test を実行し、失敗時はコミットを拒否
  - 主要操作の手順書（スクショ/短GIF）
- レビュー基準
  - 再現性（同入力→同結果）
  - バジェット遵守（操作時のフレーム落ちが限定的）

### Docs/DevEx（ドキュメント/開発体験）
- 責務
  - README（セットアップ/実行/コマンド一覧）、コーディング規約、Branch/PR テンプレ
  - スクリプト統一（pnpm scripts）とコマンド表の整備
  - コミット/PR ポリシーの明文化（小さなコミット、pre-commit チェック）と Git hooks の導入手順
  - 「3 分以内で起動」のための手順最適化
- 完了定義（DoD）
  - 初見でも `pnpm i && pnpm dev` で動作
  - コマンド/設定が README と一致
- レビュー基準
  - 簡潔さ・網羅性・最新性

## 共通レビュー基準
- シンプル: 目的に直結しない抽象化は避ける
- 一貫性: 命名・型・フォルダ構成・スクリプトの統一
- 計測: 数値安定/性能は測って判断する
- 3分原則: セットアップ〜最小動作を3分以内で達成
  - コードスタイル: Biome による 4 スペースインデント、基本ルール準拠

## コミット/PR ポリシー
- 小さなコミットを積み重ねる（1 コミット = 1 つの明確な意図）
- コミット前に必ず以下を実行し成功させる
  - `pnpm lint`（Biome）
  - `pnpm format`（Biome；必要に応じ `--check` 運用）
  - `pnpm test`（通常環境） / `pnpm test:sandbox`（制限環境）
  - 必要に応じて `pnpm coverage`
- Git hooks（pre-commit）で上記を自動実行し、失敗時はコミットを拒否
- pre-push では少なくとも `pnpm test`（通常）または `pnpm test:sandbox`（制限環境）（coverage 含む）を実行
- CI（GitHub Actions）でも同等のチェックを実施し、失敗時はマージ不可

## 受け入れ条件（PoC全体）
- マウスで境界2点→ジオデシック生成
- 交点に角度ラベル、スナップONで色変化
- (p,q,r)=(2,3,7等)で基本域に単色モチーフを深さDで展開
- 共役スライダで見え方が連続に変化
- PNG スクリーンショット出力

---

# AGENTS: 幾何ライブラリ開発ポリシー（TDD版）

この文書は、AI/人間を含むコントリビュータが守る簡易ルールです。

## 1. 基本方針
- 我々は TDD (Red → Green → Refactor) で進める。
- 受け入れテスト（acceptance）は人間が作成し、エージェントは変更しない。
- エージェントは ユニットテスト／プロパティテストの追加 と 実装 を担う。

## 2. 作業範囲
- 触ってよい：`src/geom/**`, `tests/unit/**`, `tests/property/**`, `README.md`, `AGENTS.md`, `TODO.md`
- 読み取り専用：`tests/acceptance/**`（理由：仕様ロック）
- 触らない：ビルド／CI設定は別PRで合意のうえ実施

## 3. 実装対象（最初のエピック）
- 関数シグネチャ：`circleCircleIntersection(a: Circle, b: Circle): IntersectResult`
- 型：`Vec {x,y}`, `Circle {c:Vec,r:number}`, `IntersectResult {kind:'none'|'tangent'|'two'|'concentric'|'coincident', points?: Vec[]}`
- 交点2点は x→y の昇順で返す（安定ソート必須）

## 4. テスト方針
- 受け入れテスト（人間作成、変更不可）：代表6ケース（分離/外接/内接/二交点/同心/同一）
- ユニットテスト（エージェント）：分類→座標の順で Red を作り、小刻みに Green 化
- プロパティテスト（エージェント）：交点が両円を満たす、変換不変（回転・並進・一様スケール）、入力順対称
- 近接数値は `toBeCloseTo(..., 12)` を基準。必要な許容誤差はテスト側が定義し、実装側はそれに従う

## 5. コミット規約
- 1ステップ = 「失敗するテスト追加」→「最小実装」→「リファクタ」
- 例：`test(circle): add failing test for external tangent` → `feat(circle): pass external tangent` → `refactor(circle): clean helper`

## 6. 禁止事項
- `tests/acceptance/**` の変更、削除、緩和
- 許容誤差の勝手な緩和や、判定条件の説明なしの改変
- 実装をグリーンにするためのテスト改変

## 7. Definition of Done
- 受け入れテストが全てGreen
- ユニット／プロパティテストがGreen（シード固定）
- APIシグネチャと返却規約（順序・分類）がREADMEと一致

メタ情報：
- 本ドキュメントはTDD方針へのピボット（2025-09-04）を反映している。
