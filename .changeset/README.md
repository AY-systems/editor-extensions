# パッケージのバージョン管理

## 初期設定

1. GitHubのActions設定で `Allow GitHub Actions to create and approve pull requests` を有効にします。
2. 更新PRの手動CIがPRの最新SHAに記録され、ブランチ保護の必須チェックを満たすことを確認します。
3. タグ保護ルールがある場合は、GitHubトークンによる対象タグの作成を許可します。

## 日常運用

1. 利用者向け変更のPRで `vp run changeset` を実行し、変更した対象パッケージ、patch／minor／major、日本語の変更概要を記録します。fixed設定により4パッケージが同時に更新されます。
2. ドキュメントのみ、テストのみ、対象外パッケージのみの変更ではChangesetを省略できます。必要なChangesetの有無はレビューで確認します。導入だけのChangesetは作成しません。
3. 開発PRをmasterへマージし、自動生成された更新PRのversion、CHANGELOG、lockfileを確認します。本文に英語が含まれる場合は日本語へ編集します。
4. Actions画面から `test.yml` を更新PRブランチに対して手動実行します。GitHubトークンで作られたPRでは通常のPRワークフローが自動起動しないため、この操作が必要です。
5. 最新SHAの必須チェックが成功してから更新PRをSquash and mergeします。他のマージ方法は使用しません。追加コミットが入った場合はCIを再実行します。
6. 対象SHAの `version.yml` とリモートの共通タグ `vX.Y.Z` を確認します。失敗・キャンセル時は原因を解消して同じrunを再実行します。同名タグが別SHAを指す場合は自動修復せず原因を調査します。

GitHubトークンによるタグpushは、通常、別のタグ起動ワークフローを起動しません。npm公開とその起動方法は公開側で別途設計します。
