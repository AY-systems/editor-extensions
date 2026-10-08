import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

function runGit(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function commitAll(cwd, message) {
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "-m", message]);
  return runGit(cwd, ["rev-parse", "HEAD"]);
}

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
  const invoke = (command, options = {}) => {
    const result = spawnSync(process.execPath, [scriptPath, command], {
      cwd: directory,
      encoding: "utf8",
      env: { ...env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };
  const finish = (message = "version update") => {
    const sha = commitAll(directory, message);
    env.GITHUB_SHA = sha;
    return sha;
  };
  const setVersions = async (versionByFolder) => {
    for (const [, folder] of targetPackages) {
      const manifestPath = path.join(directory, "packages", folder, "package.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifest.version = versionByFolder[folder] ?? "0.1.1";
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  };
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
    await rm(bare, { recursive: true, force: true });
  });
  return { directory, bare, base, env, invoke, finish, setVersions };
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
  assert.match(result.stderr, /4パッケージすべて/);
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

test("対象のprivate化と非privateパッケージ追加は失敗する", async (t) => {
  const repo = await fixture(t);
  const manifestPath = path.join(repo.directory, "packages/extension-div/package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.private = true;
  await writeFile(manifestPath, JSON.stringify(manifest));
  const sha = repo.finish();
  const privateResult = repo.invoke("plan", { env: { GITHUB_SHA: sha } });
  assert.notEqual(privateResult.status, 0);
  assert.match(privateResult.stderr, /非privateパッケージ/);

  const extra = await fixture(t);
  await mkdir(path.join(extra.directory, "packages/extra"), { recursive: true });
  await writeFile(
    path.join(extra.directory, "packages/extra/package.json"),
    JSON.stringify({ name: "@fixture/extra", version: "1.0.0" }),
  );
  const extraSha = extra.finish();
  const extraResult = extra.invoke("plan", { env: { GITHUB_SHA: extraSha } });
  assert.notEqual(extraResult.status, 0);
  assert.match(extraResult.stderr, /非privateパッケージ/);
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
