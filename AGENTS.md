## 全体ルール

- AIエージェントが出力する以下の項目は、常に日本語を使用すること
  - 最終回答
  - 作業中の進捗報告
  - 確認・質問
  - レビュー結果
  - PRタイトル・PR本文
  - コメント
  - エラーメッセージ
  - テストの説明文

- 絵文字を使わないこと
- PR タイトル、PR メッセージともに日本語を使用すること
- PR タイトルは Conventional Commits 形式にすること（例: `fix(web): ログインエラーを修正`）

<!--VITE PLUS START-->

# Web 用統合ツールチェーン Vite+ の使い方

このプロジェクトでは、Vite、Rolldown、Vitest、tsdown、Oxlint、Oxfmt、Vite Task を基盤とする統合ツールチェーン Vite+ を使用しています。Vite+ はランタイム管理、パッケージ管理、フロントエンドツールを単一のグローバル CLI `vp` にまとめます。Vite+ は Vite とは異なり、`vp dev` と `vp build` を通じて Vite を実行します。 `vp help` でコマンド一覧を、`vp <command> --help` で各コマンドのヘルプを表示できます。

ドキュメントは `node_modules/vite-plus/docs` にあります。オンライン版は https://viteplus.dev/guide/ です。

## 組み込みコマンドとスクリプト

`vp <name>` は組み込みコマンドを実行し、`vp run <name>` は `package.json` のスクリプトまたは `vite.config.ts` のタスクを実行します。スクリプトで組み込みコマンドを上書きすることはできないため、`vp dev` と `vp run dev` では異なる処理が実行される場合があります。まず `package.json` と `vite.config.ts` を確認し、該当するスクリプトやタスクがある場合は `vp run <name>` で実行してください。

## ツールのバージョン

`vp toolchain` を実行すると、使用中の Vite+ リリースにおけるバージョンと関係を確認できます。特定のツールを選択するにはツール名を追加します。たとえば `vp toolchain vite` のように実行します。ローカルの `vite-plus` パッケージを無視するには `--global` を付けます。`vp why <package>` では、パッケージマネージャーの依存関係グラフを表示できます。

## レビューチェックリスト

- [ ] リモート変更を取得した後、作業を始める前に `vp install` を実行する。
- [ ] 変更内容のフォーマット、Lint、型チェック、テストを行うために `vp check` と `vp test` を実行する。
- [ ] `vite.config.ts` のタスクや `package.json` のスクリプトが必要か確認し、必要に応じて `vp run <script>` で実行する。
- [ ] セットアップ、ランタイム、パッケージマネージャーの動作に問題がある場合は `vp env doctor` を実行し、助けを求める際にその出力を含める。

<!--VITE PLUS END-->
