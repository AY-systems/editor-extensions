import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// 処理を中断し、呼び出し元へエラーの理由を伝える。
function fail(message) {
  throw new Error(message);
}

// Gitを実行して前後の空白を除いた標準出力を返し、失敗時は例外にする。
function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) fail(`Gitを実行できませんでした: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = result.stderr.trim();
    fail(`Gitコマンドに失敗しました (${args[0]}): ${detail || `終了コード ${result.status}`}`);
  }
  return result.stdout.trim();
}

// Gitの終了コードを呼び出し元で判定できるよう、実行結果をそのまま返す。
function gitTry(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) fail(`Gitを実行できませんでした: ${result.error.message}`);
  return result;
}

// JSONオブジェクトを解析し、不正な形式の場合は読み込み元を含めて報告する。
function parseJson(text, source) {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("JSONオブジェクトではありません");
    return value;
  } catch (error) {
    fail(`${source} を解析できません: ${error.message}`);
  }
}

// fixed設定とワークスペースを照合し、公開対象のパッケージ名とディレクトリを返す。
async function releaseTargets() {
  const changesetConfig = parseJson(
    await readFile(path.join(root, ".changeset/config.json"), "utf8"),
    ".changeset/config.json",
  );
  if (
    !Array.isArray(changesetConfig.fixed) ||
    changesetConfig.fixed.length === 0 ||
    changesetConfig.fixed.some(
      (group) =>
        !Array.isArray(group) ||
        group.length === 0 ||
        group.some((name) => typeof name !== "string" || !name),
    )
  ) {
    fail(".changeset/config.json のfixed設定が不正です");
  }
  const names = changesetConfig.fixed.flat();
  if (new Set(names).size !== names.length) fail("fixed設定に重複したパッケージ名があります");

  const paths = ["package.json"];
  for (const directory of ["packages", "demos"]) {
    const entries = await readdir(path.join(root, directory), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) paths.push(`${directory}/${entry.name}/package.json`);
    }
  }

  const packagePaths = new Map();
  for (const relativePath of paths) {
    let manifest;
    try {
      manifest = parseJson(await readFile(path.join(root, relativePath), "utf8"), relativePath);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (relativePath === "package.json") continue;
    if (typeof manifest.name !== "string" || !manifest.name)
      fail(`${relativePath} にパッケージ名がありません`);
    if (packagePaths.has(manifest.name)) fail(`パッケージ名が重複しています: ${manifest.name}`);
    packagePaths.set(manifest.name, {
      directory: relativePath.slice(0, -"/package.json".length),
      private: manifest.private === true,
    });
  }

  return names.map((name) => {
    const found = packagePaths.get(name);
    if (!found) fail(`fixed対象のパッケージがworkspaceにありません: ${name}`);
    if (found.private) fail(`fixed対象のパッケージはprivateにできません: ${name}`);
    return [name, found.directory];
  });
}

// 安全な整数のmajor.minor.patch形式を検証し、比較用の数値配列に変換する。
function validVersion(value, source) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
    fail(`${source} のversionがmajor.minor.patch形式ではありません: ${String(value)}`);
  }
  const parts = value.split(".").map(Number);
  if (!parts.every(Number.isSafeInteger))
    fail(`${source} のversionが安全な整数の範囲外です: ${value}`);
  return parts;
}

// 数値配列のバージョンを比較し、左が小さければ-1、同じなら0、大きければ1を返す。
function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

// 作業ツリーを変更せず、指定コミットに記録されたpackage.jsonを読み込む。
function readManifestAt(commit, directory) {
  const output = git(["show", `${commit}:${directory}/package.json`]);
  return parseJson(output, `${commit}:${directory}/package.json`);
}

// ローカルのタグ名を取得し、比較しやすいようにソートして返す。
function currentTags() {
  const result = gitTry(["tag", "--list"]);
  if (result.status !== 0) fail(`Gitタグ一覧を取得できませんでした: ${result.stderr.trim()}`);
  return result.stdout.split(/\r?\n/).filter(Boolean).sort();
}

// 各コマンドが共有するタグ計画の保存先を、実行環境の一時ディレクトリ内に決める。
function planPath() {
  return path.join(process.env.RUNNER_TEMP || os.tmpdir(), "tag-plan.json");
}

// 保存済みのタグ計画を読み込み、対象SHA・タグ名・タグ一覧などの形式を検証する。
async function readPlan() {
  let plan;
  try {
    plan = JSON.parse(await readFile(planPath(), "utf8"));
  } catch (error) {
    fail(`タグ計画ファイルを読み込めません: ${error.message}`);
  }
  if (!plan || typeof plan !== "object" || Array.isArray(plan))
    fail("タグ計画ファイルの形式が不正です");
  if (
    !/^[0-9a-f]{40,64}$/i.test(plan.sha) ||
    typeof plan.shouldTag !== "boolean" ||
    (plan.shouldTag && (typeof plan.tag !== "string" || !/^v\d+\.\d+\.\d+$/.test(plan.tag)))
  ) {
    fail("タグ計画ファイルの対象SHAまたはタグ名が不正です");
  }
  if (!Array.isArray(plan.tagsBefore) || !plan.tagsBefore.every((tag) => typeof tag === "string"))
    fail("タグ計画ファイルのタグ一覧が不正です");
  return plan;
}

// HEADと第一親のバージョンを比較し、全対象の同時更新と増加を検証してタグ計画を保存する。
async function plan() {
  const targets = await releaseTargets();
  const head = git(["rev-parse", "HEAD"]);
  const eventSha = process.env.GITHUB_SHA;
  if (!eventSha || head.toLowerCase() !== eventSha.toLowerCase())
    fail("HEADがGITHUB_SHAと一致しません");

  const parent = gitTry(["rev-parse", "--verify", "HEAD^1"]);
  if (parent.status !== 0) fail("対象コミットの第一親を取得できません");
  const previous = parent.stdout.trim();
  const changed = [];
  const versions = [];

  for (const [name, directory] of targets) {
    const oldManifest = readManifestAt(previous, directory);
    const newManifest = readManifestAt(head, directory);
    if (oldManifest.name !== name || newManifest.name !== name)
      fail(`${directory} のパッケージ名が設計と一致しません`);
    if (newManifest.private === true) fail(`${name} はprivateにできません`);
    const oldVersion = oldManifest.version;
    const newVersion = newManifest.version;
    if (oldVersion !== newVersion) changed.push({ name, oldVersion, newVersion });
    versions.push({ name, oldVersion, newVersion });
  }

  const tagsBefore = currentTags();
  if (changed.length === 0) {
    await writePlanFile({
      sha: head,
      tag: null,
      remoteHasTag: false,
      tagsBefore,
      shouldTag: false,
    });
    writeOutput("should-tag", "false");
    return;
  }

  if (changed.length !== targets.length)
    fail("fixed対象の全パッケージのversionを同時に更新してください");
  for (const { name, oldVersion, newVersion } of versions) {
    const oldParts = validVersion(oldVersion, name);
    const newParts = validVersion(newVersion, name);
    if (compareVersions(newParts, oldParts) <= 0) fail(`${name} のversionは増加していません`);
  }
  const oldVersions = new Set(versions.map(({ oldVersion }) => oldVersion));
  if (oldVersions.size !== 1) fail("fixed対象パッケージの旧versionが揃っていません");
  const newVersions = new Set(versions.map(({ newVersion }) => newVersion));
  if (newVersions.size !== 1) fail("fixed対象パッケージの新versionが揃っていません");

  const tag = `v${versions[0].newVersion}`;
  const existing = gitTry(["rev-parse", "--verify", `${tag}^{commit}`]);
  if (existing.status === 0 && existing.stdout.trim() !== head)
    fail(`${tag} は対象SHAと異なるコミットを指しています`);
  if (existing.status !== 0 && existing.status !== 128)
    fail(`${tag} の参照を確認できません: ${existing.stderr.trim()}`);
  await writePlanFile({
    sha: head,
    tag,
    remoteHasTag: existing.status === 0,
    tagsBefore,
    shouldTag: true,
  });
  writeOutput("should-tag", "true");
}

// 保存先ディレクトリを用意し、後続コマンドへ渡すタグ計画をJSONで書き込む。
async function writePlanFile(value) {
  await mkdir(path.dirname(planPath()), { recursive: true });
  await writeFile(planPath(), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

// GitHub Actions上で実行している場合に、後続ステップ向けの出力値を追記する。
function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

// 計画した注釈付きタグを作成し、同じSHAを指す既存タグがあればそのまま維持する。
async function create() {
  const planFile = await readPlan();
  if (!planFile.shouldTag) return;
  const existing = gitTry(["rev-parse", "--verify", `${planFile.tag}^{commit}`]);
  if (existing.status === 0) {
    if (existing.stdout.trim() !== planFile.sha)
      fail(`${planFile.tag} は対象SHAと異なるコミットを指しています`);
    return;
  }
  if (existing.status !== 128)
    fail(`${planFile.tag} の参照を確認できません: ${existing.stderr.trim()}`);
  git(["tag", "-a", planFile.tag, planFile.sha, "-m", planFile.tag]);
}

// 計画したタグの参照先とタグ一覧を確認し、予定外のタグ追加・削除を検出する。
async function verify() {
  const planFile = await readPlan();
  if (!planFile.shouldTag) return;
  const tagCommit = gitTry(["rev-parse", "--verify", `${planFile.tag}^{commit}`]);
  if (tagCommit.status !== 0 || tagCommit.stdout.trim() !== planFile.sha)
    fail(`${planFile.tag} が対象SHAを指していません`);
  const expected = new Set(planFile.tagsBefore);
  expected.add(planFile.tag);
  const actual = currentTags();
  if (actual.length !== expected.size || actual.some((tag) => !expected.has(tag)))
    fail("タグ作成後に予定外のタグ変更を検出しました");
}

// Git設定ファイルを変更せず、子プロセスの環境変数にGitHub認証ヘッダーを追加する。
function tokenEnvironment(token) {
  if (!token) return process.env;
  const env = { ...process.env };
  const count = Number(env.GIT_CONFIG_COUNT || 0);
  const auth = Buffer.from(`x-access-token:${token}`).toString("base64");
  env.GIT_CONFIG_COUNT = String(count + 1);
  env[`GIT_CONFIG_KEY_${count}`] = "http.https://github.com/.extraheader";
  env[`GIT_CONFIG_VALUE_${count}`] = `AUTHORIZATION: basic ${auth}`;
  return env;
}

// リモートの同名タグとの衝突を確認し、計画したタグだけを送信して反映結果を検証する。
async function push() {
  const planFile = await readPlan();
  if (!planFile.shouldTag) return;
  const env = tokenEnvironment(process.env.GITHUB_TOKEN);
  const remote = gitTry(
    ["ls-remote", "--tags", "origin", `refs/tags/${planFile.tag}`, `refs/tags/${planFile.tag}^{}`],
    { env },
  );
  if (remote.status !== 0) fail(`リモートタグを確認できません: ${remote.stderr.trim()}`);
  const remoteLines = remote.stdout.split(/\r?\n/).filter(Boolean);
  if (remoteLines.length > 0) {
    const remoteSha =
      remoteLines.find((line) => line.endsWith(`refs/tags/${planFile.tag}^{}`))?.split(/\s+/)[0] ??
      remoteLines.find((line) => line.endsWith(`refs/tags/${planFile.tag}`))?.split(/\s+/)[0];
    if (remoteSha !== planFile.sha)
      fail(`${planFile.tag} はリモートで対象SHAと異なるコミットを指しています`);
    return;
  }

  const pushResult = gitTry(
    ["push", "origin", `refs/tags/${planFile.tag}:refs/tags/${planFile.tag}`],
    { env },
  );
  if (pushResult.status !== 0) fail(`タグをpushできませんでした: ${pushResult.stderr.trim()}`);
  const verifyRemote = gitTry(
    ["ls-remote", "--tags", "origin", `refs/tags/${planFile.tag}`, `refs/tags/${planFile.tag}^{}`],
    { env },
  );
  const verifyLines = verifyRemote.stdout.split(/\r?\n/).filter(Boolean);
  const verifySha =
    verifyLines.find((line) => line.endsWith(`refs/tags/${planFile.tag}^{}`))?.split(/\s+/)[0] ??
    verifyLines.find((line) => line.endsWith(`refs/tags/${planFile.tag}`))?.split(/\s+/)[0];
  if (verifyRemote.status !== 0 || verifySha !== planFile.sha) {
    fail(`${planFile.tag} のリモート反映を確認できません`);
  }
}

const commands = { plan, create, verify, push };
const command = process.argv[2];
if (!commands[command]) {
  console.error("使用方法: node scripts/version-management/tags.mjs <plan|create|verify|push>");
  process.exitCode = 1;
} else {
  try {
    await commands[command]();
  } catch (error) {
    console.error(`バージョンタグ処理エラー: ${error.message}`);
    process.exitCode = 1;
  }
}
