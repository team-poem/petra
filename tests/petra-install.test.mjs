import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { planInstall, applyInstall } from '../harness/install-petra.mjs';
import { json, hash, verifyInstalled, snapshot, exists } from '../harness/petra-files.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'petra-install-tests-'));
const pkg = path.join(temp, 'package');
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' };
for (const key of Object.keys(env)) if (/^GIT_(DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|PREFIX|CONFIG_COUNT|CONFIG_PARAMETERS|CONFIG_KEY_\d+|CONFIG_VALUE_\d+)$/.test(key)) delete env[key];
Object.assign(process.env, env);
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_PARAMETERS']) delete process.env[key];
const run = (cwd, command, ...args) => execFileSync(command, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (cwd, ...args) => run(cwd, 'git', ...args);
const write = (root, name, text) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), text); };
const commit = (root) => { git(root, 'add', '-A'); git(root, 'commit', '-qm', 'fixture'); };
function app({ empty = false } = {}) {
  const root = fs.mkdtempSync(path.join(temp, '쇼핑몰 app '));
  git(root, 'init', '-q', '-b', 'feat/install');
  if (!empty) fs.cpSync(path.join(source, 'tests/fixtures/shop'), root, { recursive: true });
  git(root, '-c', 'core.hooksPath=/dev/null', 'commit', '--allow-empty', '-qm', 'baseline');
  if (!empty) commit(root);
  return root;
}
function tree(root, mtimes = false) {
  const result = {};
  function walk(base = '') {
    for (const entry of fs.readdirSync(path.join(root, base), { withFileTypes: true })) {
      const name = base ? `${base}/${entry.name}` : entry.name;
      const file = path.join(root, name), stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) result[name] = { link: fs.readlinkSync(file) };
      else if (stat.isDirectory()) walk(name);
      else result[name] = { hash: hash(fs.readFileSync(file)), mode: stat.mode & 0o777, ...(mtimes ? { mtime: stat.mtimeMs } : {}) };
    }
  }
  walk(); return result;
}
function install(root, agents = 'both') {
  const plan = planInstall(pkg, root, agents);
  applyInstall(plan, plan.plan_id);
  return plan;
}
before(() => run(source, 'sh', 'bin/petra', 'pack', pkg));
after(() => fs.rmSync(temp, { recursive: true, force: true }));

test('dry-run은 대상의 바이트·mtime·Git 설정·인덱스를 바꾸지 않고 안정된 plan_id를 만든다', () => {
  const root = app(), before = tree(root, true);
  const a = planInstall(pkg, root), b = planInstall(pkg, root);
  assert.equal(a.plan_id, b.plan_id);
  assert.deepEqual(tree(root, true), before);
  assert.ok(a.files.find((f) => f.path === 'AGENTS.md'));
});
test('빈 앱도 README나 테스트 명령을 지어내지 않고 설치한다', () => {
  const root = app({ empty: true }); install(root);
  assert.ok(verifyInstalled(root));
  assert.equal(exists(path.join(root, 'README.md')), false);
  assert.ok(!fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8').includes('- Test:'));
});
test('기존 앱·README·Test·Codex 설정과 Claude 사용자 훅을 보존한다', () => {
  const root = app();
  const settings = { permissions: { allow: ['Read'] }, hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo custom' }] }] } };
  write(root, '.claude/settings.json', json(settings));
  write(root, '.codex/config.toml', 'model = "user-choice"\n');
  fs.chmodSync(path.join(root, 'AGENTS.md'), 0o640); commit(root);
  const old = tree(root), agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  install(root);
  const now = tree(root);
  for (const name of Object.keys(old)) if (!['AGENTS.md', '.claude/settings.json'].includes(name)) assert.deepEqual(now[name], old[name], name);
  assert.ok(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8').startsWith(agents));
  assert.equal(snapshot(root, 'AGENTS.md').mode, 0o640);
  const merged = JSON.parse(fs.readFileSync(path.join(root, '.claude/settings.json')));
  assert.deepEqual(merged.permissions, settings.permissions);
  assert.deepEqual(merged.hooks.SessionStart[0], settings.hooks.SessionStart[0]);
  assert.equal(merged.hooks.SessionStart.length, 2);
  assert.ok(verifyInstalled(root));
});
test('같은 설치 반복은 사용자 영역 수정도 보존하고 mtime까지 그대로다', () => {
  const root = app(); install(root);
  fs.appendFileSync(path.join(root, 'AGENTS.md'), '\n앱 추가 규칙\n');
  fs.appendFileSync(path.join(root, '.petra/config.sh'), '\n# 내 설정\n');
  const settings = JSON.parse(fs.readFileSync(path.join(root, '.claude/settings.json')));
  settings.permissions = { deny: ['Bash(rm *)'] }; write(root, '.claude/settings.json', json(settings));
  const before = tree(root, true), plan = planInstall(pkg, root);
  assert.equal(plan.files.length, 0); applyInstall(plan, plan.plan_id);
  assert.deepEqual(tree(root, true), before);
});
test('계획 이후 파일·Git 설정 변경과 다른 plan_id를 쓰기 전에 거절한다', () => {
  const root = app(), plan = planInstall(pkg, root);
  assert.throws(() => applyInstall(plan, 'wrong'), /계획/);
  git(root, 'config', 'collab.me', 'changed');
  const changed = planInstall(pkg, root), before = tree(root);
  assert.throws(() => applyInstall(plan, plan.plan_id), /Git 상태나 설정 변경/);
  assert.notEqual(changed.plan_id, plan.plan_id);
  assert.throws(() => applyInstall(changed, plan.plan_id), /계획/);
  assert.deepEqual(tree(root), before);
  fs.appendFileSync(path.join(root, 'AGENTS.md'), '새 편집');
  const edited = tree(root);
  assert.throws(() => applyInstall(changed, changed.plan_id), /계획 이후/);
  assert.deepEqual(tree(root), edited);
});
test('관리 파일 변경·실행 권한 변경·공유 구역 변경을 덮지 않는다', () => {
  for (const name of ['.petra/runtime/scripts/collab.sh', '.githooks/pre-push', 'AGENTS.md']) {
    const root = app(); install(root);
    if (name === '.githooks/pre-push') fs.chmodSync(path.join(root, name), 0o644);
    else if (name === 'AGENTS.md') write(root, name, '사용자가 계약 변경');
    else fs.appendFileSync(path.join(root, name), 'edited');
    const before = tree(root);
    assert.throws(() => planInstall(pkg, root));
    assert.deepEqual(tree(root), before);
  }
});
test('codex 선택은 AGENTS로 연결하며 Claude 설정이나 미검증 Codex 훅을 만들지 않는다', () => {
  const root = app(); install(root, 'codex');
  assert.equal(exists(path.join(root, '.claude')), false);
  assert.equal(exists(path.join(root, '.codex')), false);
  assert.ok(verifyInstalled(root));
});
test('기존 훅·custom hooksPath·default 훅을 덮거나 우회하지 않는다', () => {
  for (const kind of ['file', 'path', 'default', 'default-other']) {
    const root = app();
    if (kind === 'file') { write(root, '.githooks/pre-push', '#!/bin/sh\nexit 7\n'); commit(root); }
    if (kind === 'path') git(root, 'config', 'core.hooksPath', '.custom-hooks');
    if (kind.startsWith('default')) { const name = kind === 'default' ? 'pre-commit' : 'commit-msg'; write(root, `.git/hooks/${name}`, '#!/bin/sh\nexit 7\n'); fs.chmodSync(path.join(root, `.git/hooks/${name}`), 0o755); }
    const before = tree(root); assert.throws(() => planInstall(pkg, root), /훅|hooksPath|기존 파일/);
    assert.deepEqual(tree(root), before);
  }
});
test('JSON 오류·비표준 hooks·비활성 훅·출처 없는 PETRA 항목은 사전 거절한다', () => {
  for (const content of ['{broken', '[]', '{"hooks":[]}', '{"disableAllHooks":true}', '{"hooks":{"Stop":{}}}', '{"hooks":{"Stop":[{"command":".petra/custom"}]}}']) {
    const root = app(); write(root, '.claude/settings.json', content); commit(root);
    const before = tree(root); assert.throws(() => planInstall(pkg, root)); assert.deepEqual(tree(root), before);
  }
});
test('파일과 부모 심링크, 디렉토리 충돌을 통한 외부 쓰기를 거절한다', () => {
  for (const name of ['AGENTS.md', '.claude', '.githooks', '.petra']) {
    const root = app(), outside = fs.mkdtempSync(path.join(temp, 'outside-'));
    if (exists(path.join(root, name))) fs.rmSync(path.join(root, name), { recursive: true });
    fs.symlinkSync(outside, path.join(root, name)); commit(root);
    const before = tree(root); assert.throws(() => planInstall(pkg, root)); assert.deepEqual(tree(root), before); assert.deepEqual(fs.readdirSync(outside), []);
  }
});
test('main·dirty·진행 중 merge·구형 하네스·Sobaya pin/state는 변경 전에 멈춘다', () => {
  for (const kind of ['main', 'dirty', 'merge', 'legacy', 'pin', 'state']) {
    const root = app();
    if (kind === 'main') git(root, 'branch', '-m', 'main');
    if (kind === 'dirty') write(root, 'draft.txt', '작업중');
    if (kind === 'merge') write(root, '.git/MERGE_HEAD', git(root, 'rev-parse', 'HEAD'));
    if (kind === 'legacy') { write(root, 'collab/journal/old.md', '기록'); commit(root); }
    if (kind === 'pin') { write(root, 'sobaya.lock', '보존'); commit(root); }
    if (kind === 'state') write(root, '.git/sobaya/state.json', '{}');
    const before = tree(root); assert.throws(() => planInstall(pkg, root)); assert.deepEqual(tree(root), before);
  }
});
test('복사 시작·공유 파일 연결·최종 검증 단계의 실패는 이번 변경만 복구한다', () => {
  for (const name of ['.petra/bin/petra', 'AGENTS.md', '.petra/manifest.json']) {
    const root = app(), plan = planInstall(pkg, root), before = tree(root);
    assert.throws(() => applyInstall(plan, plan.plan_id, { afterWrite: (entry) => { if (entry.path === name) throw new Error('실패 주입'); } }), /복구했습니다/);
    assert.deepEqual(tree(root), before);
  }
});
test('설치 중 동시 편집은 보존하고 백업을 남기며 verify/join을 막는다', () => {
  const root = app(), plan = planInstall(pkg, root);
  assert.throws(() => applyInstall(plan, plan.plan_id, { afterWrite: (entry) => {
    if (entry.path === 'AGENTS.md') { fs.appendFileSync(path.join(root, 'AGENTS.md'), '동시 편집'); throw new Error('실패'); }
  } }), /동시 변경은 보존/);
  assert.ok(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8').endsWith('동시 편집'));
  assert.ok(exists(path.join(root, '.git/petra-install.lock/backup.json')));
  assert.throws(() => verifyInstalled(root), /불완전 설치/);
  assert.throws(() => planInstall(pkg, root), /중단된 설치/);
});
test('설치 잠금이 있으면 두 번째 실행은 아무것도 쓰지 않는다', () => {
  const root = app(), plan = planInstall(pkg, root);
  fs.mkdirSync(path.join(root, '.git/petra-install.lock'));
  const before = tree(root);
  assert.throws(() => applyInstall(plan, plan.plan_id), /중단된 설치/);
  assert.deepEqual(tree(root), before);
});
test('CLI는 공백·한글 경로에서 dry-run과 plan을 지정한 apply를 실행한다', () => {
  const root = app();
  const output = run(source, 'sh', 'bin/petra', 'install', '--target', root, '--dry-run');
  const plan = JSON.parse(output);
  run(source, 'sh', 'bin/petra', 'install', '--target', root, '--apply', '--expect-plan', plan.plan_id);
  assert.ok(verifyInstalled(root));
  assert.throws(() => run(source, 'sh', 'bin/petra', 'install', '--target', root, '--apply'), /expect-plan/);
});
test('join은 실제 커밋 차단을 켜며 shared 파일과 앱 Test를 변경하지 않는다', () => {
  const root = app(); install(root); commit(root);
  const agents = snapshot(root, 'AGENTS.md');
  run(root, 'sh', '.petra/bin/petra', 'join', 'solp');
  assert.equal(git(root, 'config', 'core.hooksPath'), '.githooks');
  assert.deepEqual(snapshot(root, 'AGENTS.md'), agents);
  write(root, 'app/page.js', 'export const page = true;'); git(root, 'add', 'app/page.js');
  assert.throws(() => git(root, 'commit', '-qm', 'claim 없음'));
  run(root, 'node', '--test');
});
test('clone한 동료도 verify와 join을 실행하고 핸들은 각자 유지한다', () => {
  const root = app(); install(root); commit(root);
  const clone = path.join(temp, 'amazon-clone'); git(temp, 'clone', '-q', root, clone);
  run(clone, 'sh', '.petra/bin/petra', 'verify');
  run(clone, 'sh', '.petra/bin/petra', 'join', 'amazon');
  assert.equal(git(clone, 'config', 'collab.me'), 'amazon');
  assert.equal(git(clone, 'status', '--porcelain'), '');
});
test('linked worktree는 별도 config 준비를 요구하고 형제 파일·config를 보존한다', () => {
  const root = app(), work = path.join(temp, 'worktree');
  git(root, 'worktree', 'add', '-qb', 'feat/worktree', work);
  assert.throws(() => planInstall(pkg, work), /worktreeConfig/);
  git(root, 'config', 'extensions.worktreeConfig', 'true');
  const before = tree(root);
  install(work); run(work, 'sh', '.petra/bin/petra', 'join', 'solp');
  const now = tree(root);
  for (const name of Object.keys(before)) assert.deepEqual(now[name], before[name], name);
  assert.equal(git(root, 'config', '--local', '--get', 'extensions.worktreeConfig'), 'true');
  assert.equal(spawnSync('git', ['-C', root, 'config', '--local', '--get', 'core.hooksPath'], { env }).status, 1);
});
test('상위 세션의 GIT_*와 에이전트 루트가 다른 앱을 가리켜도 명시 대상만 읽는다', () => {
  const root = app(), other = app(), before = tree(other);
  const polluted = { ...env, GIT_DIR: path.join(other, '.git'), GIT_WORK_TREE: other, CLAUDE_PROJECT_DIR: other, PETRA_PROJECT_ROOT: other };
  const result = spawnSync('sh', [path.join(source, 'bin/petra'), 'install', '--target', root, '--dry-run'], { cwd: other, env: polluted, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).target, fs.realpathSync(root));
  assert.deepEqual(tree(other), before);
});
test('배포물 내용이 달라지면 이전 계획과 재설치로 업데이트할 수 없다', () => {
  const root = app(), prior = planInstall(pkg, root);
  const candidate = path.join(temp, 'candidate'); fs.cpSync(pkg, candidate, { recursive: true });
  const file = '.petra/README.md'; fs.appendFileSync(path.join(candidate, file), '\n새 후보\n');
  const manifest = JSON.parse(fs.readFileSync(path.join(candidate, '.petra/manifest.json')));
  manifest.managed.find((e) => e.path === file).sha256 = hash(fs.readFileSync(path.join(candidate, file)));
  write(candidate, '.petra/manifest.json', json(manifest));
  const changed = planInstall(candidate, root);
  assert.notEqual(prior.plan_id, changed.plan_id);
  assert.throws(() => applyInstall(changed, prior.plan_id), /계획/);
  applyInstall(prior, prior.plan_id);
  const before = tree(root);
  assert.throws(() => planInstall(candidate, root), /업데이트/);
  assert.deepEqual(tree(root), before);
});
test('강제 종료 후 백업이 남고 다음 실행은 불완전 설치를 정상으로 보지 않는다', () => {
  const root = app();
  const script = `import {planInstall,applyInstall} from ${JSON.stringify(new URL('../harness/install-petra.mjs', import.meta.url).href)};
    const plan=planInstall(${JSON.stringify(pkg)},${JSON.stringify(root)});
    applyInstall(plan,plan.plan_id,{afterWrite(entry){if(entry.path==='AGENTS.md')process.kill(process.pid,'SIGKILL');}});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env });
  assert.equal(result.signal, 'SIGKILL');
  assert.ok(exists(path.join(root, '.git/petra-install.lock/backup.json')));
  assert.throws(() => planInstall(pkg, root), /중단된 설치/);
  assert.throws(() => verifyInstalled(root), /불완전 설치/);
});
test('존재하는 임시 이름도 덮거나 삭제하지 않고 원래 오류로 중단한다', () => {
  const root = app(), plan = planInstall(pkg, root);
  assert.throws(() => applyInstall(plan, plan.plan_id, { beforeWrite(entry) {
    if (entry.path === 'AGENTS.md') write(root, `.petra-write-${process.pid}`, '사용자 파일');
  } }), /EEXIST/);
  assert.equal(fs.readFileSync(path.join(root, `.petra-write-${process.pid}`), 'utf8'), '사용자 파일');
});
test('훅 항목의 키 순서는 달라도 검증하며 추가 사용자 훅을 허용한다', () => {
  const root = app(); install(root);
  const config = JSON.parse(fs.readFileSync(path.join(root, '.claude/settings.json')));
  const item = config.hooks.SessionStart[0];
  config.hooks.SessionStart = [{ hooks: item.hooks, matcher: item.matcher }, { hooks: [{ type: 'command', command: 'echo later' }] }];
  write(root, '.claude/settings.json', json(config));
  assert.ok(verifyInstalled(root));
});
test('실제 설치본의 두 clone에서 claim과 함수 변경 저널이 상대에게 도착한다', () => {
  const root = app(); install(root); commit(root); git(root, 'branch', '-m', 'main');
  const origin = path.join(temp, 'installed-origin.git'); git(temp, 'clone', '-q', '--bare', root, origin);
  const clones = {};
  for (const owner of ['solp', 'amazon']) {
    const clone = path.join(temp, `installed-${owner}`); clones[owner] = clone;
    git(temp, 'clone', '-q', origin, clone);
    run(clone, 'sh', '.petra/bin/petra', 'join', owner);
    git(clone, 'switch', '-qc', `feat/${owner}`);
    write(clone, `.petra/collab/active/feat--${owner}/claim.md`, `---\nbranch: feat/${owner}\nowner: ${owner}\ngoal: ${owner} 쇼핑몰 기능\nstatus: active\n---\n`);
    commit(clone); git(clone, 'push', '-qu', 'origin', 'HEAD');
  }
  const { solp, amazon } = clones;
  write(amazon, 'app/cart.js', 'import { price } from "../lib/price.js";\nexport const total = price(100);\n');
  write(solp, 'lib/price.js', 'export const price = (value, currency) => value;\n');
  const day = new Date().toISOString().slice(0, 10);
  write(solp, `.petra/collab/journal/${day}-solp-price.md`, '# 가격\n\n## 이벤트\n- changed lib/price.js currency 추가 → 호출부에 KRW 전달\n- ask @amazon KRW로 계산하나요?\n\n## 남은 것\n- 없음\n');
  commit(solp); git(solp, 'push');
  const digest = run(amazon, 'sh', '.petra/bin/petra', 'digest', '--fetch');
  assert.match(digest, /solp 쇼핑몰 기능/); assert.match(digest, /currency 추가/); assert.match(digest, /KRW/);
  assert.ok(verifyInstalled(solp)); assert.ok(verifyInstalled(amazon));
});
