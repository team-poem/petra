import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'petra-sharing-'));
const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' };
for (const k of Object.keys(env)) if (/^GIT_(DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|PREFIX|CONFIG|CONFIG_COUNT|CONFIG_PARAMETERS|CONFIG_KEY_\d+|CONFIG_VALUE_\d+)$/.test(k) || /^(COLLAB_|CLAUDE_PROJECT_DIR$|PETRA_PROJECT_ROOT$|RUNTIME_ROOT$|GITHUB_HEAD_REF$|NODE_TEST_CONTEXT$)/.test(k)) delete env[k];
const run = (cwd, command, ...args) => execFileSync(command, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (cwd, ...args) => run(cwd, 'git', ...args);
const cli = (cwd, ...args) => run(cwd, 'sh', '.petra/bin/petra', ...args);
const write = (root, file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), value); };
const pkg = path.join(temp, 'pkg'); run(source, 'sh', 'bin/petra', 'pack', pkg);
let serial = 0;
function pair() {
  const dir = path.join(temp, `${++serial}`); fs.mkdirSync(dir);
  const origin = path.join(dir, 'remote.git'), a = path.join(dir, 'a'), b = path.join(dir, 'b');
  git(dir, 'init', '-q', '--bare', '-b', 'main', origin);
  fs.cpSync(pkg, a, { recursive: true }); git(a, 'init', '-q', '-b', 'main');
  write(a, 'app.txt', 'base\n'); git(a, 'add', '-A'); git(a, 'commit', '-qm', 'base'); git(a, 'remote', 'add', 'origin', origin); git(a, 'push', '-qu', 'origin', 'main');
  git(dir, 'clone', '-q', origin, b);
  for (const [root, owner] of [[a, 'solp'], [b, 'amazon']]) {
    git(root, 'switch', '-qc', `feat/${owner}`); git(root, 'config', 'collab.me', owner);
    write(root, `.petra/collab/active/feat--${owner}/claim.md`, `---\nbranch: feat/${owner}\nowner: ${owner}\nstatus: active\ngoal: ${owner} feature\n---\n`);
    git(root, 'add', '-A'); git(root, 'commit', '-qm', 'claim'); git(root, 'push', '-qu', 'origin', 'HEAD');
    fs.appendFileSync(path.join(root, '.petra/config.sh'), '\nAUTO_REBASE=false\nWORKER_SHARE_SEC=1\nSHARE_TIMEOUT_SEC=2\n');
  }
  return { dir, origin, a, b };
}
after(() => fs.rmSync(temp, { recursive: true, force: true }));

test('미커밋 내용이 상대에게 보이며 HEAD와 실제 인덱스는 보존된다', () => {
  const { a, b } = pair(); write(a, 'new.txt', 'working'); write(a, '.gitignore', 'secret.txt\n'); write(a, 'secret.txt', 'private');
  const head = git(a, 'rev-parse', 'HEAD'), index = fs.readFileSync(path.join(a, '.git/index'));
  cli(a, 'share'); const d = JSON.parse(cli(b, 'digest', '--fetch', '--json'));
  assert.ok(d.others.find((o) => o.owner === 'solp').editing.includes('new.txt'));
  assert.equal(git(b, 'show', 'refs/wip/solp/feat--solp:new.txt'), 'working');
  assert.throws(() => git(b, 'show', 'refs/wip/solp/feat--solp:secret.txt'));
  assert.equal(git(a, 'rev-parse', 'HEAD'), head); assert.deepEqual(fs.readFileSync(path.join(a, '.git/index')), index);
  assert.equal(JSON.parse(cli(a, 'digest', '--json')).sharing.publish.state, 'ok');
});
test('실패·미확인·오래됨을 구별하고 단순 digest가 조회 성공 시각을 갱신하지 않는다', () => {
  const { a } = pair(); assert.equal(JSON.parse(cli(a, 'digest', '--json')).sharing.fetch.state, 'unknown');
  cli(a, 'share'); const file = path.join(a, '.git/petra/share.fetch.feat--solp');
  const record = JSON.parse(fs.readFileSync(file)); record.succeeded_at = 1; fs.writeFileSync(file, JSON.stringify(record));
  assert.equal(JSON.parse(cli(a, 'digest', '--json')).sharing.fetch.state, 'stale');
  git(a, 'remote', 'set-url', 'origin', path.join(temp, 'missing.git'));
  const failed = spawnSync('sh', ['.petra/bin/petra', 'share'], { cwd: a, env, encoding: 'utf8' });
  assert.notEqual(failed.status, 0); assert.match(failed.stderr, /전송 실패/);
  const state = JSON.parse(cli(a, 'digest', '--json')).sharing;
  assert.equal(state.fetch.state, 'failed'); assert.equal(state.publish.state, 'failed'); assert.equal(state.fetch.succeeded_at, 1);
});
test('긴 워커 실행 중 내용을 공유하고 종료 후 주기 전송이 멈춘다', async () => {
  const { a, b } = pair(); const head = git(a, 'rev-parse', 'HEAD');
  const child = spawn('sh', ['.petra/bin/petra', 'run', '--', 'sh', '-c', 'printf working > during.txt; sleep 8; exit 7'], { cwd: a, env });
  let diagnostics = ''; child.stderr.on('data', (chunk) => { diagnostics += chunk; }); child.stdout.resume();
  const done = new Promise((resolve) => child.on('close', resolve));
  await new Promise((resolve) => setTimeout(resolve, 4500));
  cli(b, 'digest', '--fetch', '--json');
  assert.equal(git(b, 'show', 'refs/wip/solp/feat--solp:during.txt'), 'working', diagnostics);
  assert.equal(child.exitCode, null, 'must observe before worker completion');
  assert.equal(await done, 7); assert.equal(git(a, 'rev-parse', 'HEAD'), head);
  const published = git(a, 'ls-remote', 'origin', 'refs/wip/solp/feat--solp');
  await new Promise((resolve) => setTimeout(resolve, 2200));
  assert.equal(git(a, 'ls-remote', 'origin', 'refs/wip/solp/feat--solp'), published);
  assert.equal(fs.existsSync(path.join(a, '.git/petra/share.lock')), false);
  assert.equal(fs.existsSync(path.join(a, '.git/petra-run.lock')), false);
});
test('checkpoint는 명시한 파일만 커밋하고 push하며 기존 staged 변경은 거절한다', () => {
  const { a } = pair(); write(a, 'app.txt', 'done'); write(a, 'unrelated.txt', 'leave');
  cli(a, 'checkpoint', '--message', '완료', '--', 'app.txt');
  assert.equal(git(a, 'show', 'HEAD:app.txt'), 'done'); assert.throws(() => git(a, 'show', 'HEAD:unrelated.txt'));
  assert.equal(git(a, 'rev-parse', 'HEAD'), git(a, 'rev-parse', 'origin/feat/solp'));
  git(a, 'add', 'unrelated.txt'); const before = fs.readFileSync(path.join(a, '.git/index'));
  assert.throws(() => cli(a, 'checkpoint', '--message', 'no', '--', 'app.txt'));
  assert.deepEqual(fs.readFileSync(path.join(a, '.git/index')), before);
});
test('같은 세션은 중복 이벤트를 줄이고 새 세션은 다시 받는다', () => {
  const { a, b } = pair();
  write(b, '.petra/collab/journal/2026-10-10-amazon-event.md', '## 이벤트\n- added lib/shared.js shared\n\n## 남은 것\n- none\n');
  git(b, 'add', '-A'); git(b, 'commit', '-qm', 'event'); git(b, 'push', '-q');
  assert.match(cli(a, 'digest', '--fetch'), /lib\/shared.js/);
  assert.doesNotMatch(cli(a, 'digest'), /\[added\]/);
  assert.match(cli(a, 'digest', '--session'), /lib\/shared.js/);
});
test('동료의 오래된 스냅샷을 현재 빈 편집으로 표시하지 않는다', () => {
  const { a, b } = pair(); cli(b, 'share');
  fs.appendFileSync(path.join(a, '.petra/config.sh'), '\nWIP_STALE_SEC=1\n');
  execFileSync('sleep', ['2']);
  const d = JSON.parse(cli(a, 'digest', '--fetch', '--json'));
  assert.equal(d.others.find((o) => o.owner === 'amazon').wip_status, 'stale');
});
test('워커 중단은 종료 코드를 보존하고 공유 타이머와 잠금을 회수한다', async () => {
  const { a } = pair();
  const child = spawn('node', ['.petra/runtime/harness/run-petra.mjs', path.join(a, '.petra/runtime/scripts/collab.sh'), '--', 'sleep', '60'], { cwd: a, env });
  child.stdout.resume(); child.stderr.resume();
  const done = new Promise((resolve) => child.on('close', resolve));
  await new Promise((resolve) => setTimeout(resolve, 500)); child.kill('SIGTERM');
  assert.equal(await done, 143);
  assert.equal(fs.existsSync(path.join(a, '.git/petra-run.lock')), false);
  assert.equal(fs.existsSync(path.join(a, '.git/petra/share.lock')), false);
});
