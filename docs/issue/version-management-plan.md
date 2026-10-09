# パッケージのバージョン管理設計

## 1. 目的と責務

公開対象の4パッケージは、変更の有無にかかわらず必ず同じバージョンへ同時更新する。非公開パッケージは更新対象から除外する。Changesetsで次の処理を実装する。

1. 開発PRに含まれるChangesetから、version・CHANGELOG・lockfileを更新するPRを自動作成する。
2. 担当者が更新PRのCIを実行し、確認後に手動でmasterへ Squash and merge する。更新PRのマージ方法は Squash and merge に限定する。
3. マージしたコミットに全対象パッケージ共通のGitタグ `vX.Y.Z` を1つ作成し、リモートへpushする。

共通タグ `vX.Y.Z` がリモートに存在し、マージしたコミットを指すことを運用上の完了条件とする。npm公開、GitHub Release作成、自動マージ、Changeset必須判定Botは実装しない。本書はこれから導入する機能の実装仕様である。

## 2. 対象と実行環境

### バージョン管理対象

次の4パッケージを1つのfixedグループとする。1パッケージだけに変更がある場合も、4パッケージすべてを同じversionへ同時更新する。対象パッケージに `private: true` は設定しない。

| パッケージ名                   | ディレクトリ                     | 導入前のversion |
| ------------------------------ | -------------------------------- | --------------- |
| `@aysys/extension-anchor-link` | `packages/extension-anchor-link` | `0.1.0`         |
| `@aysys/extension-div`         | `packages/extension-div`         | `0.1.0`         |
| `@aysys/extension-node-tag`    | `packages/extension-node-tag`    | `0.1.0`         |
| `@aysys/extension-picture`     | `packages/extension-picture`     | `0.1.0`         |

`packages/extension-classname`、`packages/extension-embed-media`、`packages/extension-table` の `package.json` に `private: true` を追加する。ルートと `demos/page-editor` のprivate設定を維持する。これら5つのversion更新・タグ作成は行わない。

対象を変更するときは、本書の一覧、fixed設定、private設定、タグ処理の対象一覧と検証項目を同じPRで更新する。

### 実行環境

| 項目                     | 指定                                                                          |
| ------------------------ | ----------------------------------------------------------------------------- |
| リポジトリ／基準ブランチ | `AY-systems/editor-extensions`／`master`                                      |
| Changesets               | CLI安定版v3、`changesets/action/version@v2`                                   |
| パッケージ管理           | Vite+経由の `pnpm@12.3.4`                                                     |
| 依存設定                 | `catalogMode: strict`、7日間のクールダウンを維持                              |
| 新規ジョブ               | `ubuntu-latest`、Node.js 24                                                   |
| セットアップ             | 既存CIと同じ `voidzero-dev/setup-vp@v1.19.0`。新規ジョブは `node-version: 24` |
| 検証                     | `vp check`、`vp test --dom`、`vp run build`                                   |

既存のビルド・prepareを維持する。ソース機能の変更や依存関係全体の更新は含めない。

## 3. 実装手順

### 3.1. 作業開始時の確認

1. GitHubの既定ブランチがmasterであること、対象4パッケージのversionが揃っていることを確認する。
2. `vp install` の後、第2章の検証コマンドを実行する。既存の整形不一致があれば、整形変更を分けて解消する。
3. すべて成功してから自動化を実装する。型アサーションによる型エラーの隠蔽、`continue-on-error` による失敗の無視は行わない。

### 3.2. Changesetsの導入

変更ファイルはルート `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、対象外3パッケージの `package.json`、新規 `.changeset/config.json`。

1. クールダウンを満たす `@changesets/cli` 安定版v3の具体的なバージョンをcatalogに追加する。ルートのdevDependenciesから `catalog:` で参照し、`vp install` でlockfileを更新する。
2. 第2章のprivate設定を適用する。
3. ルートのscriptsに次を追加する。

```json
{
  "changeset": "changeset",
  "version-packages": "changeset version && vp install --lockfile-only && vp fmt",
  "tag-packages": "node scripts/version-management/tags.mjs create"
}
```

4. `.changeset/config.json` を次の内容で作成する。

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [
    [
      "@aysys/extension-anchor-link",
      "@aysys/extension-div",
      "@aysys/extension-node-tag",
      "@aysys/extension-picture"
    ]
  ],
  "linked": [],
  "access": "public",
  "baseBranch": "master",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "privatePackages": { "version": false, "tag": false }
}
```

### 3.3. 既存CIの拡張

`.github/workflows/test.yml` に以下を適用する。

- インストール後に `vp check` を追加する。既存の `vp test --dom` と `vp run build` は維持する。
- push／pull_requestのpathsで `.github/workflows/test.yml` を `.github/workflows/**` に置き換え、`.changeset/**` と `scripts/version-management/**` を追加する。他のpathsは維持する。
- `workflow_dispatch` を追加し、UIで選んだ更新PRブランチを通常のcheckoutで検証する。独自のSHA入力は追加しない。
- 権限は `contents: read` を維持する。
- 後述のタグ処理のテスト `node --test scripts/version-management/tags.test.mjs` を追加する。

### 3.4. 自動化ワークフロー

`.github/workflows/version.yml` に、互いに独立した `version` と `tag` の2ジョブを作成する。タグ作成をversionジョブの成功やChangesetの有無に依存させない。

| 共通設定         | 値                                                             |
| ---------------- | -------------------------------------------------------------- |
| 起動             | `push`、`branches: [master]`。paths制限なし                    |
| ワークフロー権限 | `permissions: {}`。各ジョブで必要な権限を指定                  |
| 同時実行         | `group: version-master`、`cancel-in-progress: false`           |
| checkout         | 既存と同じ `actions/checkout@v4`、`persist-credentials: false` |
| インストール     | setup-vpの後に `vp install --frozen-lockfile`                  |

#### versionジョブ

権限は `contents: write` と `pull-requests: write`。checkout、セットアップ、インストールの後に次を実行する。

1. `vp exec changeset status --output "$RUNNER_TEMP/changeset-status.json"` を実行する。
2. idが `status` のステップでNode.jsを使ってJSONを読む。`releases` が配列であることを検証し、`releases.length > 0` を `$GITHUB_OUTPUT` の `has-releases` に文字列 `true`／`false` で出力する。コマンド失敗・JSON不正はジョブを失敗させる。
3. 対象がある場合だけ次のActionを実行する。

```yaml
- name: バージョン更新PRを作成
  if: steps.status.outputs.has-releases == 'true'
  uses: changesets/action/version@v2
  with:
    script: vp run version-packages
    pr-base-branch: master
    pr-title: "chore(release): パッケージのバージョンを更新"
    commit-message: "chore(release): パッケージのバージョンを更新"
```

認証はAction既定のGitHubトークンを使用する。更新PRには4パッケージのversion・CHANGELOG、lockfile、消費したChangesetの削除を含める。

#### tagジョブ

権限は `contents: write`。`ref: ${{ github.sha }}`、`fetch-depth: 0` でイベントの対象コミットと履歴・タグを取得する。処理途中や再実行時にmaster先端へ切り替えない。

判定・検証・pushは `scripts/version-management/tags.mjs` に実装する。Node.jsの標準APIを使い、Git操作は引数配列で実行する。入口は `node scripts/version-management/tags.mjs <コマンド>` とする。

タグ作成もこのスクリプトで行う。モノレポでパッケージ別タグを作成する `changeset git-tag` は使用しない。Changesetsは対象4パッケージの同時バージョン更新に使用し、Gitタグは共通タグ1つに限定する。

| コマンド | 処理と出力                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plan`   | 下記の実行条件と既存タグを検証し、`$RUNNER_TEMP/tag-plan.json` に対象SHA、共通タグ名、リモートにタグが存在するか、作成前のタグ一覧を保存する。`$GITHUB_OUTPUT` に `should-tag=true`／`false` を出力する |
| `verify` | 計画ファイルを読み、共通タグが対象SHAを指すことと、予定外のタグが増えていないことを検証する                                                                                                             |
| `push`   | 共通タグ1つだけをpushし、リモートで対象SHAを指すことを再確認する。同じSHAのタグが存在すればpushしない                                                                                                   |

`create` コマンドは計画ファイルを読み、共通タグがなければ `git tag -a <タグ名> <対象SHA> -m <タグ名>` で注釈付きタグを1つ作成する。同名タグが同じSHAを指す場合は変更せず成功し、別SHAなら失敗する。`vp run tag-packages` はこのコマンドを呼び出す。

`plan` の判定順序は次のとおり。

1. ルートと全workspaceの `package.json` を読み、非privateのパッケージ名・ディレクトリが第2章の4件と完全一致することを検証する。
2. `HEAD` が `GITHUB_SHA` と一致することを確認し、`HEAD^1` とHEADの対象4パッケージを比較する。更新PRは Squash and merge に限定するため、追加コミットを含むPR全体のversion変更をこの比較で判定できる。第一親や必要なファイルが読めなければ失敗とする。
3. version変更が0件なら `should-tag=false` で終了する。導入だけのコミットや通常の開発PRはここで終了する。
4. 変更がある場合、4件すべてが同じ旧versionから同じ新versionへ増加していることを検証する。一部だけの変更、不揃い、減少、不正なversionは失敗とする。対象は通常の `major.minor.patch` とし、プレリリースは本設計に含めない。比較は文字列順ではなく各数値の順で行う。
5. タグ名を `v<新version>` で作る。例は `v0.1.1`。パッケージ別のタグは作成しない。既存タグをコミットまで解決し、対象SHAと異なる場合は失敗とする。注釈付きタグはタグオブジェクト自体のSHAで比較しない。
6. checkoutで取得したタグをリモートの取得時点の状態として扱い、共通タグが存在するかを計画に記録する。pushステップでは認証後にリモートを再確認し、同じSHAで存在すればpushを省略する。別SHAなら失敗とし、上書き・削除しない。

実行順は `plan` → setup-vp → install → `vp run tag-packages` → `verify` → `push`。`plan` より後のステップは `should-tag == 'true'` の場合だけ実行する。タグ作成前にGitのコミッターを `github-actions[bot]`、`41898282+github-actions[bot]@users.noreply.github.com` に設定する。JSON解析失敗やGitコマンド失敗は終了コード1とし、日本語のエラーを出力する。

pushは `git push origin` に共通タグ1つの `refs/tags/<タグ名>:refs/tags/<タグ名>` を明示して実行する。`--tags`、`--force`、ブランチのpushは使用しない。pushステップだけに `${{ github.token }}` を環境変数で渡し、Gitの一時的なHTTP認証ヘッダーとして設定する。トークンをURL・ログ・永続設定へ書き込まない。npmトークン、PAT、`id-token: write` は不要。

GitHubの同時実行制御では、実行待ちの古いrunが置き換えられる場合がある。各更新PRのタグ完成を確認してから次の更新PRをマージする。失敗・キャンセル時は対象SHAのrunを再実行する。

### 3.5. 運用手順の記載

`.changeset/README.md` を新規作成し、次を記載する。

**初期設定**

1. GitHubのActions設定で `Allow GitHub Actions to create and approve pull requests` を有効にする。
2. 更新PRの手動CIがPRの最新SHAに記録され、ブランチ保護の必須チェックを満たすことを確認する。
3. タグ保護ルールがある場合は、GitHubトークンによる対象タグの作成を許可する設定を確認する。

**日常運用**

1. 利用者向け変更のPRで `vp run changeset` を実行し、変更した対象パッケージ、patch／minor／major、日本語の変更概要を記録する。fixed設定で4パッケージが同時に更新される。
2. ドキュメントのみ・テストのみ・対象外パッケージのみの変更ではChangesetを省略できる。必要なChangesetの有無はレビューで確認する。導入だけのChangesetは作成しない。
3. 開発PRをmasterへマージし、自動生成された更新PRのversion・CHANGELOG・lockfileを確認する。本文に英語が含まれる場合は担当者が日本語へ編集する。
4. Actions画面で `test.yml` を更新PRブランチに対して手動実行する。GitHubトークンによるPR作成では通常のPRワークフローが自動起動しないため、この操作が必要になる。
5. 最新SHAの必須チェックが成功してから更新PRを Squash and merge する。更新PRでは他のマージ方法を使用しない。追加コミットが入った場合はCIを再実行する。
6. 対象SHAの `version.yml` とリモートの共通タグ `vX.Y.Z` を確認する。失敗・キャンセル時は原因を解消して同じrunを再実行する。同名タグが別SHAを指す場合は自動修復せず、原因を調査する。

GitHubトークンによるタグpushは、通常、別のタグ起動ワークフローを起動しない。タグ以降のnpm公開とその起動方法は公開側で別途設計する。

## 4. 検証と完了条件

### ローカル検証

Changesetsとタグ処理は一時Gitリポジトリで検証する。push先には一時bareリポジトリを使用し、実リポジトリへ検証用Changeset、version変更、タグを残さない。タグ処理の自動テストは `scripts/version-management/tags.test.mjs` に作成する。

| 検証ケース                                    | 期待結果                                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1パッケージのpatch Changeset                  | 4パッケージが `0.1.0` → `0.1.1`。privateのversionは不変                                                    |
| minorとmajorのChangesetが混在                 | 4パッケージともmajor更新に揃う                                                                             |
| バージョン更新後のinstall                     | `vp install --frozen-lockfile` が成功                                                                      |
| version変更なし                               | `should-tag=false`。タグ作成・pushなし                                                                     |
| 4パッケージの正常なversion更新                | 共通タグ `v0.1.1` だけが作成され、対象SHAを指す。パッケージ別タグなし                                      |
| 一部だけの更新／不揃い／version減少           | タグ作成前に失敗                                                                                           |
| 非privateの対象追加／対象のprivate化          | タグ作成前に失敗                                                                                           |
| 同じSHAの既存共通タグ（注釈付き・軽量の両方） | 再実行が成功し、既存タグを維持。pushなし                                                                   |
| 共通タグがローカルにだけ存在                  | 共通タグ1つをpushし、対象SHAを指すことを確認する                                                           |
| 同名タグが別SHAを指す                         | 失敗し、既存タグを変更しない                                                                               |
| タグ作成後に予定外のタグが増加                | `verify` が失敗し、pushしない                                                                              |
| 全体の品質チェック                            | `vp check`、`vp test --dom`、`node --test scripts/version-management/tags.test.mjs`、`vp run build` が成功 |

### GitHubでの動作確認

- [ ] Changesetを含むPRのマージで更新PRが1つ作られ、後続Changesetで同じPRが更新される。
- [ ] 更新PRのベースブランチ・日本語タイトル・変更ファイルが設計どおりである。
- [ ] 更新PRの最新SHAで手動CIが成功し、ブランチ保護下で Squash and merge できる。
- [ ] version更新後に追加コミットがある更新PRを Squash and merge しても、共通タグ `vX.Y.Z` が1つだけリモートへ反映され、生成されたsquashコミット（イベントの対象SHA）を指す。
- [ ] 同じrunの再実行が成功し、タグを変更しない。
- [ ] npm公開とGitHub Release作成が実行されない。

ローカル検証とGitHubでの動作確認をすべて終えた時点で実装完了とする。未実施の項目が残る場合は、その項目を明記する。

## 5. 参照仕様

- [Changesetsの自動化・Gitタグのみの運用](https://changesets.dev/guide/automating#publish-git-tags-only)
- [Changesetsの設定](https://changesets.dev/guide/config)
- [versionサブActionの入力定義](https://github.com/changesets/action/blob/main/version/action.yml)
- [GitHub Actionsの同時実行制御](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- Vite+のローカル仕様: `node_modules/vite-plus/docs`
