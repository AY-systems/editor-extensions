import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const changesetCli = fileURLToPath(import.meta.resolve("@changesets/cli/bin.js"));
const targetPackages = [
  ["@aysys/extension-anchor-link", "extension-anchor-link"],
  ["@aysys/extension-div", "extension-div"],
  ["@aysys/extension-node-tag", "extension-node-tag"],
  ["@aysys/extension-picture", "extension-picture"],
];
const privatePackages = [
  ["@aysys/extension-classname", "extension-classname"],
  ["@aysys/extension-embed-media", "extension-embed-media"],
  ["@aysys/extension-table", "extension-table"],
];

// 指定したテスト用リポジトリでGitを実行し、失敗時はテストを中断する。
function runGit(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

// テスト用リポジトリの全変更をコミットし、作成したコミットのSHAを返す。
function commitAll(cwd, message) {
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "-m", message]);
  return runGit(cwd, ["rev-parse", "HEAD"]);
}

// 一時ワークスペースとローカルのベアリモートを作成し、操作用関数と終了時の削除処理を用意する。
async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "version-tags-"));
  const bare = `${directory}-remote.git`;
  const scriptPath = path.join(directory, "scripts/version-management/tags.mjs");
  const runnerTemp = path.join(directory, "runner-temp");
  await mkdir(path.dirname(scriptPath), { recursive: true });
  await mkdir(runnerTemp, { recursive: true });
  await cp(path.join(sourceRoot, "scripts/version-management/tags.mjs"), scriptPath);
  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({
      name: "fixture",
      version: "0.0.0",
      private: true,
      packageManager: "pnpm@12.3.4",
    }),
  );
  await writeFile(
    path.join(directory, "pnpm-workspace.yaml"),
    "packages:\n  - packages/*\n  - demos/*\n",
  );
  await mkdir(path.join(directory, ".changeset"), { recursive: true });
  await writeFile(
    path.join(directory, ".changeset/config.json"),
    JSON.stringify({
      $schema: "https://unpkg.com/@changesets/config/schema.json",
      changelog: "@changesets/cli/changelog",
      commit: false,
      fixed: [targetPackages.map(([name]) => name)],
      linked: [],
      access: "public",
      baseBranch: "master",
      updateInternalDependencies: "patch",
      ignore: [],
      privatePackages: { version: false, tag: false },
    }),
  );
  await mkdir(path.join(directory, "demos/page-editor"), { recursive: true });
  await writeFile(
    path.join(directory, "demos/page-editor/package.json"),
    JSON.stringify({ name: "fixture-demo", private: true }),
  );
  for (const [name, folder] of targetPackages) {
    const packageDirectory = path.join(directory, "packages", folder);
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      path.join(packageDirectory, "package.json"),
      JSON.stringify({ name, version: "0.1.0" }),
    );
  }
  for (const [name, folder] of privatePackages) {
    const packageDirectory = path.join(directory, "packages", folder);
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      path.join(packageDirectory, "package.json"),
      JSON.stringify({ name, version: "0.1.0", private: true }),
    );
  }

  runGit(directory, ["init", "-b", "master"]);
  runGit(directory, ["config", "user.name", "Version Tag Tests"]);
  runGit(directory, ["config", "user.email", "version-tags@example.invalid"]);
  const base = commitAll(directory, "base");
  execFileSync("git", ["init", "--bare", bare], { stdio: "ignore" });
  runGit(directory, ["remote", "add", "origin", bare]);
  runGit(directory, ["push", "-u", "origin", "master"]);

  const env = { ...process.env, RUNNER_TEMP: runnerTemp };
  // テスト用の環境変数でタグ処理を実行し、終了コードと出力を検証用に返す。
  const invoke = (command, options = {}) => {
    const result = spawnSync(process.execPath, [scriptPath, command], {
      cwd: directory,
      encoding: "utf8",
      env: { ...env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };
  // 変更をコミットし、GitHub Actionsのイベント対象SHAもそのコミットに合わせる。
  const finish = (message = "version update") => {
    const sha = commitAll(directory, message);
    env.GITHUB_SHA = sha;
    return sha;
  };
  // 現在のfixed対象だけを更新し、個別指定のないパッケージは0.1.1に揃える。
  const setVersions = async (versionByFolder) => {
    const config = JSON.parse(
      await readFile(path.join(directory, ".changeset/config.json"), "utf8"),
    );
    const names = config.fixed.flat();
    const entries = await readdir(path.join(directory, "packages"), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(directory, "packages", entry.name, "package.json");
      let manifest;
      try {
        manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
      if (!names.includes(manifest.name)) continue;
      manifest.version = versionByFolder[entry.name] ?? "0.1.1";
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  };
  // 対象の追加・除外を検証するため、fixed設定を指定した名前の単一グループに置き換える。
  const setFixed = async (names) => {
    const configPath = path.join(directory, ".changeset/config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.fixed = [names];
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  };
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
    await rm(bare, { recursive: true, force: true });
  });
  return { directory, bare, base, env, invoke, finish, setVersions, setFixed };
}

test("更新がないコミットはタグ計画を作らない", async (t) => {
  const repo = await fixture(t);
  await writeFile(path.join(repo.directory, "README.md"), "documentation only\n");
  const sha = repo.finish("docs");
  const outputFile = path.join(repo.directory, "github-output");
  const result = repo.invoke("plan", { env: { GITHUB_SHA: sha, GITHUB_OUTPUT: outputFile } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(outputFile, "utf8"), /should-tag=false/);
  assert.equal(runGit(repo.directory, ["tag", "--list"]), "");
});

test("1パッケージのpatch Changesetで対象4パッケージだけを同じversionへ更新する", async (t) => {
  const repo = await fixture(t);
  await writeFile(
    path.join(repo.directory, ".changeset/patch.md"),
    '---\n"@aysys/extension-div": patch\n---\n機能を追加\n',
  );
  commitAll(repo.directory, "add patch changeset");
  const result = spawnSync(process.execPath, [changesetCli, "version"], {
    cwd: repo.directory,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(result.status, 0, result.stderr);
  for (const [, folder] of targetPackages) {
    const manifest = JSON.parse(
      await readFile(path.join(repo.directory, "packages", folder, "package.json"), "utf8"),
    );
    assert.equal(manifest.version, "0.1.1");
  }
  for (const [, folder] of privatePackages) {
    const manifest = JSON.parse(
      await readFile(path.join(repo.directory, "packages", folder, "package.json"), "utf8"),
    );
    assert.equal(manifest.version, "0.1.0");
  }
  assert.equal(
    await readFile(path.join(repo.directory, "packages/extension-div/CHANGELOG.md"), "utf8").then(
      () => true,
      () => false,
    ),
    true,
  );
  assert.deepEqual(
    await import("node:fs/promises").then(({ readdir }) =>
      readdir(path.join(repo.directory, ".changeset")),
    ),
    ["config.json"],
  );
  const install = spawnSync("vp", ["install", "--lockfile-only"], {
    cwd: repo.directory,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(install.status, 0, install.stderr);
});

test("minorとmajorのChangesetが混在する場合は4パッケージすべてをmajor更新する", async (t) => {
  const repo = await fixture(t);
  await writeFile(
    path.join(repo.directory, ".changeset/minor.md"),
    '---\n"@aysys/extension-div": minor\n---\n機能を追加\n',
  );
  await writeFile(
    path.join(repo.directory, ".changeset/major.md"),
    '---\n"@aysys/extension-picture": major\n---\n互換性を変更\n',
  );
  commitAll(repo.directory, "add mixed changesets");
  const result = spawnSync(process.execPath, [changesetCli, "version"], {
    cwd: repo.directory,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(result.status, 0, result.stderr);
  for (const [, folder] of targetPackages) {
    const manifest = JSON.parse(
      await readFile(path.join(repo.directory, "packages", folder, "package.json"), "utf8"),
    );
    assert.equal(manifest.version, "1.0.0");
  }
});

test("4パッケージを更新すると共通の注釈付きタグを作成・検証・pushできる", async (t) => {
  const repo = await fixture(t);
  await repo.setVersions({});
  const sha = repo.finish();
  const plan = repo.invoke("plan", { env: { GITHUB_SHA: sha } });
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(
    await readFile(path.join(repo.env.RUNNER_TEMP, "tag-plan.json"), "utf8"),
    /"tag": "v0\.1\.1"/,
  );
  assert.equal(repo.invoke("create").status, 0);
  assert.equal(repo.invoke("create").status, 0);
  assert.equal(repo.invoke("verify").status, 0);
  assert.equal(repo.invoke("push").status, 0);
  assert.equal(repo.invoke("push").status, 0);
  assert.equal(runGit(repo.bare, ["rev-parse", "refs/tags/v0.1.1^{}"]), sha);
  assert.equal(runGit(repo.directory, ["tag", "--list"]), "v0.1.1");
});

test("一部のパッケージだけの更新は失敗する", async (t) => {
  const repo = await fixture(t);
  const manifestPath = path.join(repo.directory, "packages/extension-div/package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.version = "0.1.1";
  await writeFile(manifestPath, JSON.stringify(manifest));
  const sha = repo.finish();
  const result = repo.invoke("plan", { env: { GITHUB_SHA: sha } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /fixed対象の全パッケージ/);
  assert.equal(runGit(repo.directory, ["tag", "--list"]), "");
});

test("旧versionが揃っていないパッケージの更新は失敗する", async (t) => {
  const repo = await fixture(t);
  const manifestPath = path.join(repo.directory, "packages/extension-div/package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.version = "0.1.1";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  repo.finish("旧versionが不揃いな状態を作成");
  await repo.setVersions(Object.fromEntries(targetPackages.map(([, folder]) => [folder, "0.1.2"])));
  const sha = repo.finish();
  const result = repo.invoke("plan", { env: { GITHUB_SHA: sha } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /旧versionが揃っていません/);
  assert.equal(runGit(repo.directory, ["tag", "--list"]), "");
});

test("4パッケージの更新versionが不揃いまたは不正なら失敗する", async (t) => {
  const repo = await fixture(t);
  await repo.setVersions({ "extension-picture": "0.1.2" });
  const sha = repo.finish();
  const result = repo.invoke("plan", { env: { GITHUB_SHA: sha } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /versionが揃っていません/);

  const malformed = await fixture(t);
  await malformed.setVersions(
    Object.fromEntries(targetPackages.map(([, folder]) => [folder, "0.1.0-rc.1"])),
  );
  const malformedSha = malformed.finish();
  const malformedResult = malformed.invoke("plan", { env: { GITHUB_SHA: malformedSha } });
  assert.notEqual(malformedResult.status, 0);
  assert.match(malformedResult.stderr, /major\.minor\.patch/);
});

test("fixed対象のprivate化とworkspaceにないパッケージの指定は失敗する", async (t) => {
  const repo = await fixture(t);
  const manifestPath = path.join(repo.directory, "packages/extension-div/package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.private = true;
  await writeFile(manifestPath, JSON.stringify(manifest));
  const sha = repo.finish();
  const privateResult = repo.invoke("plan", { env: { GITHUB_SHA: sha } });
  assert.notEqual(privateResult.status, 0);
  assert.match(privateResult.stderr, /fixed対象のパッケージはprivate/);

  const extra = await fixture(t);
  await extra.setFixed([...targetPackages.map(([name]) => name), "@fixture/missing"]);
  const extraSha = extra.finish();
  const extraResult = extra.invoke("plan", { env: { GITHUB_SHA: extraSha } });
  assert.notEqual(extraResult.status, 0);
  assert.match(extraResult.stderr, /fixed対象のパッケージがworkspaceにありません/);
});

test("fixed設定への追加と除外がタグ対象へ反映される", async (t) => {
  const added = await fixture(t);
  const addedPath = path.join(added.directory, "packages/extension-classname/package.json");
  const addedManifest = JSON.parse(await readFile(addedPath, "utf8"));
  addedManifest.private = false;
  await writeFile(addedPath, `${JSON.stringify(addedManifest, null, 2)}\n`);
  await added.setFixed([...targetPackages.map(([name]) => name), "@aysys/extension-classname"]);
  await added.setVersions({});
  const addedSha = added.finish();
  const addedPlan = added.invoke("plan", { env: { GITHUB_SHA: addedSha } });
  assert.equal(addedPlan.status, 0, addedPlan.stderr);
  assert.equal(added.invoke("create").status, 0);
  assert.equal(added.invoke("verify").status, 0);
  assert.equal(runGit(added.directory, ["rev-parse", "v0.1.1^{commit}"]), addedSha);

  const excluded = await fixture(t);
  await excluded.setFixed(targetPackages.slice(0, -1).map(([name]) => name));
  const excludedPath = path.join(excluded.directory, "packages/extension-picture/package.json");
  const excludedManifest = JSON.parse(await readFile(excludedPath, "utf8"));
  excludedManifest.version = "0.1.1";
  await writeFile(excludedPath, `${JSON.stringify(excludedManifest, null, 2)}\n`);
  const excludedSha = excluded.finish();
  const excludedPlan = excluded.invoke("plan", { env: { GITHUB_SHA: excludedSha } });
  assert.equal(excludedPlan.status, 0, excludedPlan.stderr);
  assert.match(
    await readFile(path.join(excluded.env.RUNNER_TEMP, "tag-plan.json"), "utf8"),
    /"shouldTag": false/,
  );
});

test("リリース後に非公開パッケージをfixedへ追加してもChangesetsの更新をタグ付けできる", async (t) => {
  const repo = await fixture(t);
  await repo.setVersions({});
  const manifestPath = path.join(repo.directory, "packages/extension-classname/package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.version = "0.1.1";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  repo.finish("既存対象をリリース");
  manifest.private = false;
  await writeFile(manifestPath, JSON.stringify(manifest));
  await repo.setFixed([...targetPackages.map(([name]) => name), manifest.name]);
  await writeFile(
    path.join(repo.directory, ".changeset/patch.md"),
    '---\n"@aysys/extension-div": patch\n---\n公開対象を追加\n',
  );
  repo.finish("公開対象とChangesetを追加");
  const version = spawnSync(process.execPath, [changesetCli, "version"], {
    cwd: repo.directory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(version.status, 0, version.stderr);
  const sha = repo.finish();
  const plan = repo.invoke("plan");
  assert.equal(plan.status, 0, plan.stderr);
  assert.equal(repo.invoke("create").status, 0);
  assert.equal(repo.invoke("verify").status, 0);
  assert.equal(repo.invoke("push").status, 0);
  assert.equal(runGit(repo.bare, ["rev-parse", "refs/tags/v0.1.2^{}"]), sha);
});

test("fixedへ追加したパッケージのバージョン降下や不正な旧versionは拒否する", async (t) => {
  for (const oldVersion of ["0.2.0", "不正なバージョン"]) {
    const repo = await fixture(t);
    const manifestPath = path.join(repo.directory, "packages/extension-classname/package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.version = oldVersion;
    await writeFile(manifestPath, JSON.stringify(manifest));
    repo.finish("非公開パッケージの旧versionを設定");
    manifest.private = false;
    await writeFile(manifestPath, JSON.stringify(manifest));
    await repo.setFixed([...targetPackages.map(([name]) => name), manifest.name]);
    await repo.setVersions({});
    repo.finish();
    const plan = repo.invoke("plan");
    assert.notEqual(plan.status, 0);
    assert.match(plan.stderr, /@aysys\/extension-classname/);
    assert.match(plan.stderr, /増加していません|major\.minor\.patch/);
    assert.equal(runGit(repo.directory, ["tag", "--list"]), "");
  }
});

test("fixed対象外privateパッケージの追加・削除はタグ判定に影響しない", async (t) => {
  const added = await fixture(t);
  const extraDirectory = path.join(added.directory, "packages/private-extra");
  await mkdir(extraDirectory, { recursive: true });
  await writeFile(
    path.join(extraDirectory, "package.json"),
    JSON.stringify({ name: "@fixture/private-extra", version: "1.0.0", private: true }),
  );
  const addedSha = added.finish("add private package");
  const addedPlan = added.invoke("plan", { env: { GITHUB_SHA: addedSha } });
  assert.equal(addedPlan.status, 0, addedPlan.stderr);

  const removed = await fixture(t);
  await rm(path.join(removed.directory, "packages/extension-table"), { recursive: true });
  const removedSha = removed.finish("remove private package");
  const removedPlan = removed.invoke("plan", { env: { GITHUB_SHA: removedSha } });
  assert.equal(removedPlan.status, 0, removedPlan.stderr);
});

test("既存タグが別SHAを指す場合は失敗し、タグを変更しない", async (t) => {
  const repo = await fixture(t);
  await repo.setVersions({});
  const sha = repo.finish();
  runGit(repo.directory, ["tag", "-a", "v0.1.1", repo.base, "-m", "existing"]);
  const result = repo.invoke("plan", { env: { GITHUB_SHA: sha } });
  assert.notEqual(result.status, 0);
  assert.equal(runGit(repo.directory, ["rev-parse", "v0.1.1^{}"]), repo.base);
});

test("予定外のタグ増加は検証で失敗する", async (t) => {
  const repo = await fixture(t);
  await repo.setVersions({});
  const sha = repo.finish();
  assert.equal(repo.invoke("plan", { env: { GITHUB_SHA: sha } }).status, 0);
  assert.equal(repo.invoke("create").status, 0);
  runGit(repo.directory, ["tag", "unexpected-tag", sha]);
  const result = repo.invoke("verify");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /予定外のタグ変更/);
});

test("同じSHAの軽量タグと注釈付きタグを再実行時に維持する", async (t) => {
  for (const annotated of [false, true]) {
    const repo = await fixture(t);
    await repo.setVersions({});
    const sha = repo.finish();
    runGit(
      repo.directory,
      annotated ? ["tag", "-a", "v0.1.1", sha, "-m", "existing"] : ["tag", "v0.1.1", sha],
    );
    runGit(repo.directory, ["push", "origin", "refs/tags/v0.1.1"]);
    const plan = repo.invoke("plan", { env: { GITHUB_SHA: sha } });
    assert.equal(plan.status, 0, plan.stderr);
    assert.equal(repo.invoke("create").status, 0);
    assert.equal(repo.invoke("verify").status, 0);
    // 既存タグを含む状態で計画からやり直しても検証に成功する。
    assert.equal(repo.invoke("plan", { env: { GITHUB_SHA: sha } }).status, 0);
    assert.equal(repo.invoke("create").status, 0);
    assert.equal(repo.invoke("verify").status, 0);
    assert.equal(repo.invoke("push").status, 0);
    assert.equal(
      runGit(repo.bare, ["rev-parse", annotated ? "refs/tags/v0.1.1^{}" : "refs/tags/v0.1.1"]),
      sha,
    );
    assert.equal(
      runGit(repo.directory, ["cat-file", "-t", "refs/tags/v0.1.1"]),
      annotated ? "tag" : "commit",
    );
  }
});
