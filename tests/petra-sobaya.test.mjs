import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { planLifecycle, applyLifecycle } from '../harness/lifecycle-petra.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = process.env.SOBAYA_TEST_ASSETS;
const version = '1.0.0-rc.1';
const hashes = {
  'install-runtime.sh': '4f2201dfe8afe7041233451bcfd4de24b86a9e3ddd5558f5e525bba9d7fb2ccf',
  'sobaya-1.0.0-rc.1.json': 'e19564a05a104e4f38c4403495d100ede632d7c844daf64fae67adeada3b3e26',
  'sobaya-1.0.0-rc.1.tar.gz': 'd8b4e49a149a0e637c94a6663fb6433b8d0621dc376e31d776babbea247551b8',
};
const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

test('PETRA 설치본과 공개 Sobaya 런타임의 소비자 흐름', { timeout: 240_000 }, async (t) => {
  assert.ok(assets, 'SOBAYA_TEST_ASSETS에 검증할 공개 rc.1 자산 경로를 지정하세요');
  for (const [name, expected] of Object.entries(hashes)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(assets, name))).digest('hex'), expected, name);
  }
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'petra-sobaya-')));
  t.after(() => {
    if (process.env.PETRA_KEEP_TEST_EVIDENCE === '1') console.log(`EVIDENCE: ${root}`);
    else fs.rmSync(root, { recursive: true, force: true });
  });
  const app = path.join(root, "shop's app"), store = path.join(root, 'personal store');
  const remote = path.join(root, 'origin.git');
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_ALLOW_PROTOCOL: 'file', GIT_TEMPLATE_DIR: path.join(root, 'git-template') };
  for (const key of Object.keys(env)) if (/^GIT_(DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|PREFIX|CONFIG|CONFIG_COUNT|CONFIG_PARAMETERS|CONFIG_KEY_\d+|CONFIG_VALUE_\d+)$/.test(key) || /^(COLLAB_|CLAUDE_PROJECT_DIR$|PETRA_PROJECT_ROOT$|RUNTIME_ROOT$|GITHUB_HEAD_REF$)/.test(key)) delete env[key];
  // The app's Node runner must emit TAP, not inherit this test process's IPC reporter.
  delete env.NODE_TEST_CONTEXT;
  fs.mkdirSync(env.GIT_TEMPLATE_DIR);
  const sentinels = path.join(root, 'sentinels');
  for (const tool of ['curl', 'codex', 'gh']) {
    const file = path.join(sentinels, tool);
    write(file, tool === 'gh' ? '#!/bin/sh\nexit 1\n' : '#!/bin/sh\nprintf called >> "$PETRA_NETWORK_LOG"\nexit 93\n');
    fs.chmodSync(file, 0o755);
  }
  Object.assign(env, { PATH: `${sentinels}:${env.PATH}`, PETRA_NETWORK_LOG: path.join(root, 'network'), PETRA_PROMPTS: path.join(root, 'prompts'), PETRA_LINT_LOG: path.join(root, 'lint') });
  const run = (cwd, command, ...args) => execFileSync(command, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 }).trim();
  const git = (cwd, ...args) => run(cwd, 'git', ...args);
  const petra = (cwd, ...args) => run(cwd, 'sh', path.join(cwd, '.petra/bin/petra'), ...args);
  const refused = (cwd, ...args) => {
    const result = spawnSync('sh', [path.join(cwd, '.petra/bin/petra'), ...args], { cwd, env, encoding: 'utf8' });
    assert.notEqual(result.status, 0, result.stdout);
    return `${result.stdout}${result.stderr}`;
  };
  const commit = (cwd, fixture = false) => {
    git(cwd, 'add', '-A');
    git(cwd, ...(fixture ? ['-c', 'core.hooksPath=/dev/null'] : []), 'commit', '-qm', 'fixture');
  };
  fs.mkdirSync(app);
  git(app, 'init', '-q', '-b', 'feat/install');
  git(app, 'config', 'user.name', 'Fixture'); git(app, 'config', 'user.email', 'fixture@example.invalid');
  write(path.join(app, 'AGENTS.md'), '# Shop fixture\n- Test: `node --test suite.test.cjs`\n- Lint: `node lint.cjs`\n');
  write(path.join(app, 'README.md'), '# Existing shop\n');
  write(path.join(app, 'src/add.cjs'), 'module.exports = (a, b) => 0;\n');
  write(path.join(app, 'suite.test.cjs'), "// file: suite.test.cjs\nconst test = require('node:test');\nconst assert = require('node:assert/strict');\ntest('baseline', () => assert.equal(42, 42));\n");
  write(path.join(app, 'lint.cjs'), "require('node:fs').appendFileSync(process.env.PETRA_LINT_LOG, 'lint\\n');\n");
  commit(app, true);
  const plan = JSON.parse(run(source, 'sh', 'bin/petra', 'install', '--target', app, '--dry-run'));
  run(source, 'sh', 'bin/petra', 'install', '--target', app, '--apply', '--expect-plan', plan.plan_id);
  commit(app, true);
  git(app, 'branch', '-M', 'main');
  git(root, 'init', '-q', '--bare', remote);
  git(app, 'remote', 'add', 'origin', remote); git(app, 'push', '-q', '-u', 'origin', 'main');
  git(app, 'switch', '-qc', 'feat/runtime');
  write(path.join(app, '.petra/collab/active/feat--runtime/claim.md'), '---\nbranch: feat/runtime\nowner: solp\nstarted: 2026-10-10\nstatus: active\ngoal: fixture runtime\n---\n');
  petra(app, 'join', 'solp');
  commit(app);
  git(app, 'push', '-q', '-u', 'origin', 'feat/runtime');
  const meta = path.join(git(app, 'rev-parse', '--absolute-git-dir'), 'sobaya');
  const runtime = (...args) => run(app, path.join(store, 'bin/sobaya'), ...args, '--root', app, '--install-root', store);

  await t.test('새 설치본에 adapter가 포함되고 attach는 입력 없는 앱을 바꾸지 않는다', () => {
    assert.equal(fs.existsSync(path.join(app, 'harness')), false);
    run(app, '/bin/bash', path.join(assets, 'install-runtime.sh'), '--root', app, '--install-root', store, '--version', version, '--manifest', path.join(assets, `sobaya-${version}.json`), '--archive', path.join(assets, `sobaya-${version}.tar.gz`));
    git(app, 'config', 'extensions.worktreeConfig', 'true');
    const head = git(app, 'rev-parse', 'HEAD');
    assert.match(refused(app, 'sobaya', 'attach', '--install-root', store, '--version', version), /spec.md/);
    assert.equal(git(app, 'rev-parse', 'HEAD'), head);
    assert.equal(git(app, 'status', '--porcelain'), '');
    assert.equal(fs.existsSync(meta), false);
  });
  await t.test('명시적 attach는 앱 계약·명세·초안·HEAD를 보존하고 승인하지 않는다', () => {
    write(path.join(app, 'spec.md'), '# Fixture\nAdd two inputs. No real app approval.\n');
    write(path.join(app, 'failed-test.md'), '# Fixture plan\n## Add\n```js\n// file: suite.test.cjs\n```\n- [ ] installedAddition - sums the two inputs\n```js\ntest(\'installedAddition\', () => assert.equal(require(\'./src/add.cjs\')(1, 2), 3));\n```\n');
    commit(app);
    const before = Object.fromEntries(['README.md', 'AGENTS.md', 'spec.md', 'failed-test.md'].map((name) => [name, read(path.join(app, name))]));
    const head = git(app, 'rev-parse', 'HEAD');
    // A foreign cwd/environment must not redirect the installed adapter.
    run(root, 'env', `GIT_DIR=${remote}`, 'sh', path.join(app, '.petra/bin/petra'), 'sobaya', 'attach', '--install-root', store, '--version', version);
    for (const [name, content] of Object.entries(before)) assert.equal(read(path.join(app, name)), content);
    assert.equal(git(app, 'rev-parse', 'HEAD'), head);
    assert.equal(fs.existsSync(path.join(meta, 'state.json')), false);
    assert.equal(json(path.join(meta, 'connection.json')).root, app);
    assert.equal(JSON.parse(petra(app, 'sobaya', 'check', '--install-root', store)).connected, true);
    commit(app);
  });
  await t.test('join·digest·실제 커밋은 전달 훅을 유지하고 lint를 한 번 실행한다', () => {
    const hooks = git(app, 'config', '--get', 'core.hooksPath');
    const connection = read(path.join(meta, 'connection.json'));
    petra(app, 'join', 'solp');
    assert.equal(git(app, 'config', '--get', 'core.hooksPath'), hooks);
    assert.equal(read(path.join(meta, 'connection.json')), connection);
    const digest = petra(app, 'digest');
    assert.match(digest, /이 worktree의 설치형 연결 확인/);
    assert.match(digest, /sh \.petra\/bin\/petra sobaya sync/);
    assert.doesNotMatch(digest, /git 훅이 꺼져/);
    fs.writeFileSync(env.PETRA_LINT_LOG, '');
    write(path.join(app, 'src/second.cjs'), 'module.exports = 2;\n'); commit(app);
    assert.equal(read(env.PETRA_LINT_LOG), 'lint\n');
  });
  await t.test('손상된 전달 훅에서는 join이 핸들·설정을 바꾸지 않는다', () => {
    const file = path.join(meta, 'hooks/pre-commit'), original = read(file);
    const config = git(app, 'config', '--show-origin', '--list');
    try {
      fs.appendFileSync(file, '\n# unexpected\n');
      assert.match(refused(app, 'join', 'other'), /conflicts/);
      assert.equal(git(app, 'config', '--show-origin', '--list'), config);
    } finally { fs.writeFileSync(file, original); }
    const connectionFile = path.join(meta, 'connection.json'), connection = read(connectionFile);
    try {
      fs.unlinkSync(connectionFile);
      assert.match(refused(app, 'join', 'other'), /connection.json/);
      assert.equal(git(app, 'config', '--show-origin', '--list'), config);
    } finally { fs.writeFileSync(connectionFile, connection); }
  });
  await t.test('연결된 원본의 새 worktree는 독립적으로 join하며 연결을 복사하지 않는다', () => {
    const hooks = git(app, 'config', '--get', 'core.hooksPath');
    petra(app, 'worktree', 'feat/parallel');
    const other = `${app}-feat--parallel`;
    petra(other, 'join', 'amazon');
    assert.equal(git(other, 'config', 'collab.me'), 'amazon');
    assert.equal(git(app, 'config', 'collab.me'), 'solp');
    assert.equal(git(app, 'config', 'core.hooksPath'), hooks);
    assert.equal(fs.existsSync(path.join(git(other, 'rev-parse', '--absolute-git-dir'), 'sobaya')), false);
  });
  await t.test('새 clone의 main은 plan 없이 팀 pin을 sync하고 연결은 명시적으로 남긴다', () => {
    const clone = path.join(root, 'fresh clone'), freshStore = path.join(root, 'fresh store');
    git(root, 'clone', '-q', '-b', 'feat/runtime', remote, clone);
    git(clone, 'config', 'user.name', 'Fixture'); git(clone, 'config', 'user.email', 'fixture@example.invalid');
    git(clone, 'rm', 'spec.md', 'failed-test.md'); commit(clone, true); git(clone, 'branch', '-M', 'main');
    petra(clone, 'join', 'amazon');
    const pins = ['sobaya.json', 'sobaya.lock'].map((name) => read(path.join(clone, name)));
    const head = git(clone, 'rev-parse', 'HEAD');
    petra(clone, 'sobaya', 'sync', '--install-root', freshStore, '--cli', path.join(store, 'bin/sobaya'), '--archive', path.join(assets, `sobaya-${version}.tar.gz`));
    assert.deepEqual(['sobaya.json', 'sobaya.lock'].map((name) => read(path.join(clone, name))), pins);
    assert.equal(git(clone, 'rev-parse', 'HEAD'), head);
    assert.equal(git(clone, 'status', '--porcelain'), '');
    assert.equal(fs.existsSync(path.join(clone, '.git/sobaya/connection.json')), false);
    assert.equal(JSON.parse(petra(clone, 'sobaya', 'check', '--install-root', freshStore)).connected, false);
  });
  await t.test('공개 runtime의 RED→구현→gate→review가 PETRA run·Git 훅을 통과한다', () => {
    const worker = path.join(root, 'worker.sh'), policy = path.join(root, 'policy.json');
    write(worker, '#!/bin/bash\nset -eu\ncat >> "$PETRA_PROMPTS"\nif [ "$SOBAYA_ROLE" = implement ]; then\n  printf "module.exports = (a, b) => a + b;\\n" > "$SOBAYA_APP/src/add.cjs"\nfi\nprintf \'%s\\n\' \'{"status":"done","summary":"Deterministic fixture only","reason":""}\'\n');
    write(policy, JSON.stringify({ version: 1, mode: 'selected', default_worker: 'fixture', review_worker: 'fixture', max_calls: 3, timeout_seconds: 30, workers: { fixture: { adapter: 'command', command: ['/bin/bash', worker], model: 'fixture', guidance: 'guided' } }, escalation: [] }));
    const baseline = git(app, 'rev-parse', 'HEAD');
    // This approval applies only to the synthetic fixture, never to a user's app/tests.
    runtime('approve', '--app', app);
    const output = petra(app, 'run', '--', path.join(store, 'bin/sobaya'), 'loop', '--root', app, '--install-root', store, '--app', app, '--policy', policy);
    assert.match(output, /RED/); assert.match(output, /PASS/);
    runtime('gate', '--app', app);
    const state = json(path.join(meta, 'state.json'));
    assert.equal(state.baseline, baseline); assert.equal(state.calls, 2);
    assert.equal(state.active, null); assert.equal(state.status, 'complete');
    assert.equal(state.review.head, git(app, 'rev-parse', 'HEAD'));
    assert.match(read(path.join(app, 'failed-test.md')), /\[x\] installedAddition/);
    assert.ok(read(env.PETRA_PROMPTS).includes(`${app}/AGENTS.md`));
    assert.equal(git(app, 'status', '--porcelain'), '');
    const before = read(path.join(meta, 'state.json'));
    petra(app, 'join', 'solp');
    assert.equal(read(path.join(meta, 'state.json')), before);
    petra(app, 'worktree', 'feat/approved-parallel');
    const other = `${app}-feat--approved-parallel`;
    petra(other, 'join', 'solp');
    assert.equal(fs.existsSync(path.join(git(other, 'rev-parse', '--absolute-git-dir'), 'sobaya/state.json')), false);
    assert.equal(read(path.join(meta, 'state.json')), before);
  });
  await t.test('종료 시 plan은 새 기록 경로에 보관되고 check·pr-body가 읽는다', () => {
    const archive = path.join(app, '.petra/collab/journal/plans/fixture');
    fs.mkdirSync(archive, { recursive: true });
    for (const name of ['spec.md', 'failed-test.md']) git(app, 'mv', name, path.relative(app, path.join(archive, name)));
    write(path.join(app, '.petra/collab/journal/2026-10-10-solp-runtime.md'), '# Fixture handoff\n\n## 이벤트\n- added src/add.cjs 두 입력의 합 구현 → 호출자가 재사용\n\n## 남은 것\n- 없음. 실제 모델 품질 검증은 별도.\n');
    commit(app);
    petra(app, 'check');
    assert.match(petra(app, 'pr-body'), /src\/add.cjs/);
    petra(app, 'verify');
    assert.equal(fs.existsSync(env.PETRA_NETWORK_LOG), false, 'unexpected network or model call');
  });
  await t.test('PETRA 업데이트는 실제 Sobaya 전달 훅·승인·팀 pin·HEAD를 보존한다', () => {
    const evidence = Object.fromEntries(['state.json', 'connection.json', 'original-hooks.json'].map((name) => [name, read(path.join(meta, name))]));
    const pins = ['sobaya.json', 'sobaya.lock'].map((name) => read(path.join(app, name)));
    const head = git(app, 'rev-parse', 'HEAD'), hooks = git(app, 'config', 'core.hooksPath');
    const pkg = path.join(root, 'next-petra'); run(source, 'sh', 'bin/petra', 'pack', pkg);
    fs.appendFileSync(path.join(pkg, '.petra/README.md'), '\nfixture upgrade\n');
    const manifest = json(path.join(pkg, '.petra/manifest.json'));
    manifest.version = '0.1.1';
    manifest.managed.find((entry) => entry.path === '.petra/README.md').sha256 = createHash('sha256').update(read(path.join(pkg, '.petra/README.md'))).digest('hex');
    write(path.join(pkg, '.petra/manifest.json'), JSON.stringify(manifest));
    const plan = planLifecycle(pkg, app); applyLifecycle(plan, plan.plan_id);
    assert.match(read(path.join(app, '.petra/README.md')), /fixture upgrade/);
    for (const [name, bytes] of Object.entries(evidence)) assert.equal(read(path.join(meta, name)), bytes);
    assert.deepEqual(['sobaya.json', 'sobaya.lock'].map((name) => read(path.join(app, name))), pins);
    assert.equal(git(app, 'rev-parse', 'HEAD'), head); assert.equal(git(app, 'config', 'core.hooksPath'), hooks);
    assert.equal(JSON.parse(petra(app, 'sobaya', 'check', '--install-root', store)).connected, true);
    petra(app, 'verify');
  });
});
