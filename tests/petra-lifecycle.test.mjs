import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { planInstall, applyInstall } from '../harness/install-petra.mjs';
import { planLifecycle, applyLifecycle, recover } from '../harness/lifecycle-petra.mjs';
import { snapshot, hash, json, verifyInstalled } from '../harness/petra-files.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'petra-lifecycle-tests-'));
const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' };
for (const key of Object.keys(env)) if (/^GIT_(DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|PREFIX|CONFIG_COUNT|CONFIG_PARAMETERS|CONFIG_KEY_\d+|CONFIG_VALUE_\d+)$/.test(key)) delete env[key];
Object.assign(process.env, env);
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_PARAMETERS']) delete process.env[key];
const run = (cwd, command, ...args) => execFileSync(command, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (cwd, ...args) => run(cwd, 'git', ...args);
const write = (root, name, value) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), value); };
const commit = (root) => { git(root, 'add', '-A'); git(root, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture'); };
const original = path.join(tmp, 'original'); run(source, 'sh', 'bin/petra', 'pack', original);
function pack(version) {
  const dest = path.join(tmp, version); fs.cpSync(original, dest, { recursive: true });
  const file = path.join(dest, '.petra/manifest.json'), manifest = JSON.parse(fs.readFileSync(file)); manifest.version = version;
  const name = '.petra/README.md'; fs.appendFileSync(path.join(dest, name), `\n${version}\n`);
  manifest.managed.find((entry) => entry.path === name).sha256 = hash(fs.readFileSync(path.join(dest, name)));
  fs.writeFileSync(file, json(manifest)); return dest;
}
const old = pack('0.0.10'), next = pack('0.1.0');
function app() {
  const root = fs.mkdtempSync(path.join(tmp, 'app-')); git(root, 'init', '-q', '-b', 'feat/lifecycle');
  write(root, 'AGENTS.md', '# App\n- Test: `node --test`\n'); write(root, 'app.txt', 'application'); commit(root); return root;
}
function installed() {
  const root = app(), plan = planInstall(old, root); applyInstall(plan, plan.plan_id);
  write(root, '.petra/collab/journal/team.md', 'team record'); fs.appendFileSync(path.join(root, '.petra/config.sh'), '\n# my project\n'); commit(root); return root;
}
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('update dry-run은 무변경, 적용은 설정·팀 기록·앱·Git 상태를 보존한다', () => {
  const root = installed(), names = ['app.txt', '.petra/config.sh', '.petra/collab/journal/team.md'];
  const before = Object.fromEntries(names.map((name) => [name, snapshot(root, name)]));
  const head = git(root, 'rev-parse', 'HEAD'), index = snapshot(path.join(root, '.git'), 'index');
  const plan = planLifecycle(next, root); assert.equal(plan.plan_id, planLifecycle(next, root).plan_id);
  assert.equal(verifyInstalled(root).version, '0.0.10'); applyLifecycle(plan, plan.plan_id);
  assert.equal(verifyInstalled(root).version, '0.1.0');
  for (const name of names) assert.deepEqual(snapshot(root, name), before[name]);
  assert.equal(git(root, 'rev-parse', 'HEAD'), head); assert.deepEqual(snapshot(path.join(root, '.git'), 'index'), index);
  commit(root); const again = planLifecycle(next, root); assert.equal(again.files.length, 0);
});
test('명시적 rollback도 설정·저널을 보존하고 자동 downgrade는 막는다', () => {
  const root = installed(); let plan = planLifecycle(next, root); applyLifecycle(plan, plan.plan_id); commit(root);
  assert.throws(() => planLifecycle(old, root), /rollback/);
  plan = planLifecycle(old, root, { operation: 'rollback' }); applyLifecycle(plan, plan.plan_id);
  assert.equal(verifyInstalled(root).version, '0.0.10'); assert.equal(fs.readFileSync(path.join(root, '.petra/collab/journal/team.md'), 'utf8'), 'team record');
});
test('사용자가 바꾼 관리 파일과 plan 이후 변경은 덮지 않는다', () => {
  const root = installed(), plan = planLifecycle(next, root);
  write(root, 'app.txt', 'new work'); assert.throws(() => applyLifecycle(plan, plan.plan_id), /커밋/);
  commit(root); fs.appendFileSync(path.join(root, '.petra/README.md'), 'custom'); commit(root);
  assert.throws(() => planLifecycle(next, root), /관리 파일 변경/);
});
test('업데이트 중 실패는 원본으로 복구하고 동시 편집은 남긴다', () => {
  const root = installed(), before = snapshot(root, '.petra/README.md'), plan = planLifecycle(next, root);
  assert.throws(() => applyLifecycle(plan, plan.plan_id, { afterWrite(entry) { if (entry.path === '.petra/README.md') throw new Error('injected'); } }), /복구/);
  assert.deepEqual(snapshot(root, '.petra/README.md'), before); assert.equal(verifyInstalled(root).version, '0.0.10');
});
test('중단 복구는 쓴 파일만 되돌리고 다른 편집이 있으면 멈춘다', () => {
  const root = installed(), before = snapshot(root, '.petra/README.md');
  write(root, '.petra/README.md', 'partial'); const after = snapshot(root, '.petra/README.md');
  write(root, '.git/petra-install.lock/backup.json', json({ target: fs.realpathSync(root), files: [{ path: '.petra/README.md', before, after }], written: ['.petra/README.md'], createdDirs: [] }));
  assert.equal(recover(root).applied, false); write(root, '.petra/README.md', 'concurrent');
  assert.throws(() => recover(root, true), /동시 변경 보존/); assert.equal(fs.readFileSync(path.join(root, '.petra/README.md'), 'utf8'), 'concurrent');
  write(root, '.petra/README.md', 'partial'); recover(root, true); assert.deepEqual(snapshot(root, '.petra/README.md'), before); assert.ok(verifyInstalled(root));
});
test('구형 이전은 기록을 바이트 그대로 이동하고 알 수 없는 사용자 런타임은 남긴다', () => {
  const baseline = path.join(tmp, 'legacy'); git(tmp, 'clone', '-q', '--no-hardlinks', source, baseline);
  const root = app();
  for (const name of ['harness', 'scripts', '.githooks', '.claude/settings.json']) fs.cpSync(path.join(baseline, name), path.join(root, name), { recursive: true });
  write(root, 'collab/active/feat--lifecycle/claim.md', 'owner: solp\nbranch: feat/lifecycle\ngoal: migration\nstatus: active\n');
  write(root, 'collab/active/feat--other/claim.md', 'owner: amazon\nbranch: feat/other\n');
  write(root, 'collab/journal/2026-10-10-amazon-old.md', '## 이벤트\n- changed lib/a.ts contract\n\n## 남은 것\n- none\n');
  write(root, 'harness/user-custom.sh', 'keep me'); commit(root); git(root, 'branch', 'main');
  const record = snapshot(root, 'collab/journal/2026-10-10-amazon-old.md'), config = snapshot(root, 'harness/config.sh');
  const plan = planLifecycle(next, root, { operation: 'migrate', legacySource: baseline }); applyLifecycle(plan, plan.plan_id);
  assert.deepEqual(snapshot(root, '.petra/collab/journal/2026-10-10-amazon-old.md'), record);
  assert.equal(fs.existsSync(path.join(root, 'collab/journal/2026-10-10-amazon-old.md')), false);
  assert.deepEqual(snapshot(root, '.petra/config.sh'), config);
  assert.equal(fs.readFileSync(path.join(root, 'harness/user-custom.sh'), 'utf8'), 'keep me');
  assert.ok(verifyInstalled(root)); assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /Test: `node --test`/);
  git(root, 'config', 'collab.me', 'solp'); git(root, 'add', '-A');
  run(root, 'sh', '.petra/bin/petra', 'precommit');
  fs.appendFileSync(path.join(root, '.petra/collab/journal/2026-10-10-amazon-old.md'), 'tampered'); git(root, 'add', '-A');
  assert.throws(() => run(root, 'sh', '.petra/bin/petra', 'precommit'), /이전 기록/);
  fs.writeFileSync(path.join(root, '.petra/collab/journal/2026-10-10-amazon-old.md'), Buffer.from(record.bytes, 'base64'));
  write(root, '.petra/collab/journal/2026-10-10-solp-migration.md', '## 이벤트\n- migrated .petra/collab/ records\n\n## 남은 것\n- none\n');
  commit(root); run(root, 'sh', '.petra/bin/petra', 'check', '--base', 'main');
});

test('소비자 온보딩·스킬·PR·CI는 기존 사용자 양식과 설정을 덮지 않는다', () => {
  const root = app(); write(root, '.github/PULL_REQUEST_TEMPLATE.md', 'user template'); write(root, '.github/workflows/app.yml', 'user workflow'); commit(root);
  const plan = planInstall(next, root); applyInstall(plan, plan.plan_id);
  assert.equal(fs.readFileSync(path.join(root, '.github/PULL_REQUEST_TEMPLATE.md'), 'utf8'), 'user template');
  assert.equal(fs.readFileSync(path.join(root, '.github/workflows/app.yml'), 'utf8'), 'user workflow');
  assert.ok(fs.existsSync(path.join(root, '.agents/skills/petra/SKILL.md')));
  assert.ok(fs.existsSync(path.join(root, '.claude/skills/petra/SKILL.md')));
  assert.match(run(root, 'sh', '.petra/bin/petra', 'onboard'), /state=join/);
  run(root, 'sh', '.petra/bin/petra', 'join', 'solp');
  assert.match(run(root, 'sh', '.petra/bin/petra', 'onboard'), /이미 합류/);
  assert.match(fs.readFileSync(path.join(root, '.github/workflows/petra-check.yml'), 'utf8'), /contents: read/);
});
