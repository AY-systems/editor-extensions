import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const targets = new Map([
  ["@aysys/extension-anchor-link", "packages/extension-anchor-link"],
  ["@aysys/extension-div", "packages/extension-div"],
  ["@aysys/extension-node-tag", "packages/extension-node-tag"],
  ["@aysys/extension-picture", "packages/extension-picture"],
]);
const expectedPrivate = new Map([
  ["@aysys/extension-classname", "packages/extension-classname"],
  ["@aysys/extension-embed-media", "packages/extension-embed-media"],
  ["@aysys/extension-table", "packages/extension-table"],
]);

function fail(message) {
  throw new Error(message);
}

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

function parseManifest(text, source) {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("JSONオブジェクトではありません");
    return value;
  } catch (error) {
    fail(`${source} のpackage.jsonを解析できません: ${error.message}`);
  }
}

async function validateWorkspace() {
  const paths = ["package.json"];
  for (const directory of ["packages", "demos"]) {
    const entries = await readdir(path.join(root, directory), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) paths.push(`${directory}/${entry.name}/package.json`);
    }
  }

  const publicPackages = new Map();
  const packagePaths = new Map();
  for (const relativePath of paths) {
    let manifest;
    try {
      manifest = parseManifest(await readFile(path.join(root, relativePath), "utf8"), relativePath);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (relativePath === "package.json") continue;
    if (typeof manifest.name !== "string" || !manifest.name)
      fail(`${relativePath} にパッケージ名がありません`);
    if (packagePaths.has(manifest.name)) fail(`パッケージ名が重複しています: ${manifest.name}`);
    packagePaths.set(manifest.name, relativePath.slice(0, -"/package.json".length));
    if (manifest.private !== true)
      publicPackages.set(manifest.name, packagePaths.get(manifest.name));
  }

  const sameEntries = (actual, expected) =>
    actual.size === expected.size &&
    [...expected].every(([name, directory]) => actual.get(name) === directory);
  if (!sameEntries(publicPackages, targets)) {
    fail("非privateパッケージが設計対象の4パッケージと一致しません");
  }
  for (const [name, directory] of expectedPrivate) {
    const manifest = parseManifest(
      await readFile(path.join(root, directory, "package.json"), "utf8"),
      directory,
    );
    if (manifest.name !== name || manifest.private !== true)
      fail(`${directory} はprivate設定されている必要があります`);
  }
  for (const [name, directory] of targets) {
    const manifest = parseManifest(
      await readFile(path.join(root, directory, "package.json"), "utf8"),
      directory,
    );
    if (manifest.name !== name || manifest.private === true)
      fail(`${directory} は対象の公開パッケージである必要があります`);
  }
}

function validVersion(value, source) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
    fail(`${source} のversionがmajor.minor.patch形式ではありません: ${String(value)}`);
  }
  const parts = value.split(".").map(Number);
  if (!parts.every(Number.isSafeInteger))
    fail(`${source} のversionが安全な整数の範囲外です: ${value}`);
  return parts;
}

function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

function readManifestAt(commit, directory) {
  const output = git(["show", `${commit}:${directory}/package.json`]);
  return parseManifest(output, `${commit}:${directory}`);
}

function currentTags() {
  const result = gitTry(["tag", "--list"]);
  if (result.status !== 0) fail(`Gitタグ一覧を取得できませんでした: ${result.stderr.trim()}`);
  return result.stdout.split(/\r?\n/).filter(Boolean).sort();
}

function planPath() {
  return path.join(process.env.RUNNER_TEMP || os.tmpdir(), "tag-plan.json");
}

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

async function plan() {
  await validateWorkspace();
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
    if (oldManifest.private === true || newManifest.private === true)
      fail(`${name} はprivateにできません`);
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

  if (changed.length !== targets.size)
    fail("対象4パッケージすべてのversionを同時に更新してください");
  const oldVersions = new Set(versions.map(({ oldVersion }) => oldVersion));
  const newVersions = new Set(versions.map(({ newVersion }) => newVersion));
  if (oldVersions.size !== 1 || newVersions.size !== 1)
    fail("対象4パッケージの旧version・新versionが揃っていません");
  const oldVersion = validVersion(versions[0].oldVersion, targets.keys().next().value);
  const newVersion = validVersion(versions[0].newVersion, targets.keys().next().value);
  if (compareVersions(newVersion, oldVersion) <= 0)
    fail("対象パッケージのversionは増加していません");

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

async function writePlanFile(value) {
  await mkdir(path.dirname(planPath()), { recursive: true });
  await writeFile(planPath(), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

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
