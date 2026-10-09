import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { applyInstall, agentBlock } from './install-petra.mjs';
import { hash, json, equal, exists, git, optionalGit, safePath, snapshot, repoInfo, assertJoinable, documentBlock, verifyInstalled, managedForAgent } from './petra-files.mjs';

function metadataTree(root) {
  const files = {};
  if (!exists(root)) return files;
  function walk(dir = '') {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const name = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(name);
      else files[name] = snapshot(root, name);
    }
  }
  walk(); return files;
}
export function lifecycleState(info, { legacy = false } = {}) {
  const { root, meta } = info;
  if (exists(path.join(meta, 'petra-install.lock'))) throw new Error('중단된 설치가 있습니다. recover 먼저 실행하세요');
  for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'index.lock', 'petra-run.lock']) if (exists(path.join(meta, name))) throw new Error(`Git/워커 작업 진행 중: ${name}`);
  const branch = git(root, 'symbolic-ref', '--short', 'HEAD');
  if (['main', 'master', 'develop'].includes(branch)) throw new Error('작업 브랜치에서 실행하세요');
  if (git(root, 'status', '--porcelain', '--untracked-files=all')) throw new Error('변경을 먼저 커밋하세요. 자동 stash는 하지 않습니다');
  if (legacy) {
    if (exists(path.join(root, 'harness/sobaya.lock'))) throw new Error('구형 소스 클론 Sobaya 연결은 먼저 설치형으로 별도 검토해야 합니다. 자동 이전하지 않습니다');
    const hooks = optionalGit(root, 'config', '--get', 'core.hooksPath');
    if (exists(path.join(meta, 'sobaya'))) {
      const saved = JSON.parse(Buffer.from(snapshot(meta, 'sobaya/connection.json')?.bytes || '', 'base64'));
      const status = JSON.parse(execFileSync('sh', [path.join(root, 'harness/sobaya-installed.sh'), 'check', '--install-root', saved.store], { encoding: 'utf8' }));
      if (status.connected !== true) throw new Error('기존 Sobaya 연결 확인 실패');
    } else if (hooks && hooks !== '.githooks') throw new Error('기존 hooksPath는 자동 변경하지 않습니다');
  } else assertJoinable(root, { allowInstalledSobaya: true });
  const sobaya = metadataTree(path.join(meta, 'sobaya'));
  if (sobaya['state.json']) {
    const state = JSON.parse(Buffer.from(sobaya['state.json'].bytes, 'base64'));
    if (state.active != null) throw new Error('Sobaya 항목 실행 중에는 업데이트하지 않습니다');
  }
  // A live management/runner lock is not interpreted as permission to update.
  for (const name of ['sobaya/lock.shell', 'sobaya/lock', 'sobaya-management.lock']) {
    if (exists(path.join(meta, name))) {
      const runtime = legacy ? root : path.join(root, '.petra/runtime');
      try { execFileSync('sh', ['-c', '. "$1/harness/hooks/lib.sh"; ! sobaya_busy', 'petra', runtime], { cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root }, stdio: 'pipe' }); }
      catch { throw new Error('Sobaya 잠금이 살아 있거나 상태를 확인하지 못했습니다'); }
      break;
    }
  }
  return { branch, head: git(root, 'rev-parse', 'HEAD'), config: optionalGit(root, 'config', '--show-origin', '--show-scope', '--list'), index: snapshot(meta, 'index')?.sha256 ?? null, sobaya };
}

function hooksConfig(root, source, previous, read, add) {
  const name = '.claude/settings.json', before = read(name);
  const config = before ? JSON.parse(Buffer.from(before.bytes, 'base64')) : {};
  if (!config || Array.isArray(config) || typeof config !== 'object' || config.disableAllHooks === true) throw new Error('Claude 훅 설정 충돌');
  config.hooks ??= {};
  if (Array.isArray(config.hooks) || typeof config.hooks !== 'object') throw new Error('Claude hooks 구조 충돌');
  for (const [event, entries] of Object.entries(previous || {})) {
    const items = config.hooks[event] || [];
    for (const entry of entries) if (items.filter((item) => equal(item, entry)).length !== 1) throw new Error(`기존 훅 변경: ${event}`);
    config.hooks[event] = items.filter((item) => !entries.some((entry) => equal(item, entry)));
  }
  const hooks = JSON.parse(Buffer.from(snapshot(source, name).bytes, 'base64')).hooks;
  for (const [event, entries] of Object.entries(hooks)) {
    const items = config.hooks[event] ?? [];
    if (!Array.isArray(items) || JSON.stringify(items).includes('.petra/')) throw new Error(`관리 이력 없는 PETRA 훅: ${event}`);
    config.hooks[event] = [...items, ...entries];
  }
  add(name, Buffer.from(json(config)), before?.mode ?? 0o644);
  return { path: name, kind: 'hooks', hooks };
}

export function planLifecycle(packageRoot, target, { operation = 'update', legacySource, agents } = {}) {
  if (!['update', 'rollback', 'migrate'].includes(operation)) throw new Error('update | rollback | migrate 중 하나를 선택하세요');
  const incoming = verifyInstalled(packageRoot, { duringInstall: true });
  if (incoming.installation) throw new Error('설치된 앱은 배포물이 아닙니다');
  const info = repoInfo(target), { root } = info, legacy = operation === 'migrate';
  const state = lifecycleState(info, { legacy });
  const previous = legacy ? null : verifyInstalled(root);
  if (previous && !previous.installation) throw new Error('staging pack은 update 대상이 아닙니다. 최초 설치를 먼저 완료하세요');
  const version = (value) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(value);
    if (!match) throw new Error(`지원하지 않는 버전: ${value}`);
    return match.slice(1).map(Number);
  };
  if (previous) {
    const from = version(previous.version), to = version(incoming.version);
    const delta = to.map((part, index) => part - from[index]).find((part) => part !== 0) || 0;
    if (operation === 'update' && delta < 0) throw new Error('낮은 버전은 명시적으로 rollback을 사용하세요');
    if (operation === 'rollback' && delta >= 0) throw new Error('rollback은 이전 버전 배포물을 지정하세요');
  }
  agents ??= previous?.installation?.agents || 'both';
  if (!['both', 'codex', 'claude'].includes(agents)) throw new Error('잘못된 agents 옵션');
  if (previous && agents !== previous.installation?.agents) throw new Error('업데이트 중 agent 선택은 변경하지 않습니다');
  const watched = {}, files = [], shared = [], preserved = [];
  const read = (name) => (watched[name] = snapshot(root, name));
  const add = (name, bytes, mode = 0o644) => {
    const before = read(name), after = bytes === null ? null : { bytes: Buffer.from(bytes).toString('base64'), sha256: hash(bytes), mode };
    if (!equal(before, after)) files.push({ path: name, before, after });
  };
  const copy = (source, from, to = from) => { const file = snapshot(source, from); if (!file) throw new Error(`파일 없음: ${from}`); add(to, Buffer.from(file.bytes, 'base64'), file.mode); };
  let legacyHooks;
  if (legacy) {
    if (!legacySource || !exists(path.join(root, 'collab')) || exists(path.join(root, '.petra'))) throw new Error('migrate는 .petra 없는 구형 프로젝트와 --legacy-source <사용한 템플릿 checkout>이 필요합니다');
    legacySource = fs.realpathSync(legacySource);
    if (git(legacySource, 'status', '--porcelain', '--untracked-files=all')) throw new Error('legacy-source는 변경 없는 검토한 checkout이어야 합니다');
    // Only remove runtime files proven byte-for-byte against the supplied baseline.
    const paths = ['harness', 'scripts/collab.sh', '.githooks', '.codex/hooks.json', '.agents/skills/start-work', '.agents/skills/handoff', '.agents/skills/onboard'];
    const candidates = git(legacySource, 'ls-files', '--', ...paths).split('\n').filter(Boolean);
    for (const name of git(root, 'ls-files', '--', ...paths).split('\n').filter(Boolean)) if (!candidates.includes(name)) preserved.push(name);
    for (const name of candidates) {
      if (name === 'harness/config.sh' || !exists(path.join(root, name))) continue;
      const before = read(name), known = snapshot(legacySource, name);
      if (!equal(before, known)) { preserved.push(name); continue; }
      if (!name.startsWith('.githooks/')) add(name, null);
    }
    for (const entry of incoming.managed.filter((entry) => entry.path.startsWith('.githooks/'))) {
      if (exists(path.join(root, entry.path)) && !equal(read(entry.path), snapshot(legacySource, entry.path))) throw new Error(`수정한 Git 훅은 자동 교체하지 않습니다: ${entry.path}`);
    }
    const records = metadataTree(path.join(root, 'collab'));
    for (const [relative, file] of Object.entries(records)) {
      if (!/^(active|journal)\//.test(relative)) continue;
      copy(root, `collab/${relative}`, `.petra/collab/${relative}`); add(`collab/${relative}`, null);
    }
    // Preserve project settings exactly; record paths are fixed by load_config.
    copy(root, 'harness/config.sh', '.petra/config.sh'); add('harness/config.sh', null);
    if (agents !== 'codex' && exists(path.join(root, '.claude/settings.json'))) {
      legacyHooks = JSON.parse(Buffer.from(snapshot(legacySource, '.claude/settings.json').bytes, 'base64')).hooks;
    }
  } else {
    read('.petra/config.sh');
    for (const entry of previous.managed) read(entry.path);
    for (const entry of previous.shared || []) read(entry.path);
  }
  const managed = [];
  for (const entry of incoming.managed) {
    if (!managedForAgent(entry, agents, root)) continue;
    if (read(entry.path) && !previous?.managed.some((old) => old.path === entry.path) && !(legacy && entry.path.startsWith('.githooks/'))) throw new Error(`새 관리 경로에 사용자 파일이 있습니다: ${entry.path}`);
    copy(packageRoot, entry.path);
    const file = snapshot(packageRoot, entry.path); managed.push({ path: entry.path, sha256: file.sha256, mode: file.mode });
  }
  if (previous) for (const entry of previous.managed) if (!managed.some((next) => next.path === entry.path)) add(entry.path, null);
  const prior = read('AGENTS.md'), text = prior ? Buffer.from(prior.bytes, 'base64').toString() : '';
  const oldBlock = previous?.shared.find((entry) => entry.path === 'AGENTS.md');
  if (oldBlock) add('AGENTS.md', text.replace(documentBlock(text), agentBlock), prior.mode);
  else {
    if (text.includes('<!-- petra:')) throw new Error('출처 없는 PETRA 문서 구역');
    add('AGENTS.md', `${text}${text ? '\n\n' : ''}${agentBlock}\n`, prior?.mode ?? 0o644);
  }
  shared.push({ path: 'AGENTS.md', kind: 'document', block: agentBlock });
  if (agents !== 'codex') shared.push(hooksConfig(root, packageRoot, legacyHooks ?? previous?.shared.find((entry) => entry.kind === 'hooks')?.hooks, read, add));
  const packageId = hash(json({ managed, agents }));
  add('.petra/manifest.json', json({ ...incoming, managed, shared, installation: { package_id: packageId, agents }, ...(legacy ? { migration: { from: git(legacySource, 'rev-parse', 'HEAD'), records: 'collab', preserved } } : {}) }));
  const writtenPaths = files.filter((entry) => entry.after).map((entry) => entry.path);
  const ignored = writtenPaths.length ? optionalGit(root, 'check-ignore', '--', ...writtenPaths) : '';
  if (ignored) throw new Error(`설치 파일이 Git에서 제외됩니다: ${ignored}`);
  const material = { target: root, operation, package_id: packageId, state, watched, files, preserved };
  return { ...material, info, plan_id: hash(json(material)) };
}

export function applyLifecycle(plan, expected, hooks = {}) {
  const preflightCheck = (info) => lifecycleState(info, { legacy: plan.operation === 'migrate' });
  applyInstall(plan, expected, { ...hooks, preflightCheck, verify(root) {
    verifyInstalled(root, { duringInstall: true });
    if (!equal(metadataTree(path.join(plan.info.meta, 'sobaya')), plan.state.sobaya)) throw new Error('Sobaya 상태가 작업 중 변경됐습니다. 파일 변경을 복구합니다');
  } });
}

export function recover(target, apply = false) {
  const info = repoInfo(target), lock = path.join(info.meta, 'petra-install.lock');
  const backup = JSON.parse(fs.readFileSync(path.join(lock, 'backup.json')));
  if (backup.target !== info.root || !Array.isArray(backup.files) || !Array.isArray(backup.written)) throw new Error('복구 자료 형식 오류');
  const restores = [];
  for (const name of [...backup.written].reverse()) {
    if (name === '.git' || name.startsWith('.git/')) throw new Error('Git 메타데이터는 복구 대상으로 허용하지 않습니다');
    const entry = backup.files.find((file) => file.path === name);
    if (!entry || restores.some((item) => item.path === name)) throw new Error('복구 목록 오류');
    for (const value of [entry.before, entry.after]) if (value && hash(Buffer.from(value.bytes, 'base64')) !== value.sha256) throw new Error('복구 데이터 해시 불일치');
    const current = snapshot(info.root, name);
    if (equal(current, entry.before)) continue;
    if (!equal(current, entry.after)) throw new Error(`동시 변경 보존: ${name}. 백업을 검토해 수동 복구하세요`);
    restores.push(entry);
  }
  if (apply) {
    for (const entry of restores) {
      const file = safePath(info.root, entry.path);
      if (!equal(snapshot(info.root, entry.path), entry.after)) throw new Error(`복구 중 동시 변경: ${entry.path}`);
      if (entry.before) {
        fs.writeFileSync(file, Buffer.from(entry.before.bytes, 'base64'), { mode: entry.before.mode });
        fs.chmodSync(file, entry.before.mode);
      } else fs.unlinkSync(file);
    }
    for (const dir of [...backup.createdDirs].reverse()) {
      if (dir === '.git' || dir.startsWith('.git/')) throw new Error('잘못된 복구 디렉터리');
      try { fs.rmdirSync(safePath(info.root, dir)); } catch { /* Keep concurrent user files. */ }
    }
    fs.rmSync(lock, { recursive: true });
  }
  return { paths: restores.map((entry) => entry.path), applied: apply };
}

function main() {
  const args = process.argv.slice(2), operation = args.shift(), options = {};
  while (args.length) {
    const key = args.shift();
    if (Object.hasOwn(options, key)) throw new Error(`중복 옵션: ${key}`);
    if (['--dry-run', '--apply'].includes(key)) options[key] = true;
    else if (['--source', '--target', '--legacy-source', '--agents', '--expect-plan'].includes(key) && args.length) options[key] = args.shift();
    else throw new Error(`알 수 없거나 값 없는 옵션: ${key}`);
  }
  if (!options['--target'] || Boolean(options['--dry-run']) === Boolean(options['--apply'])) throw new Error(`${operation} --target ROOT --dry-run | --apply --expect-plan ID`);
  if (operation === 'recover') { console.log(json(recover(options['--target'], options['--apply']))); return; }
  if (!options['--source']) throw new Error('검토한 제작 리포 --source가 필요합니다');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'petra-lifecycle-'));
  try {
    const pkg = path.join(temp, 'package');
    execFileSync('sh', [path.join(options['--source'], 'harness/package-petra.sh'), pkg], { stdio: 'pipe' });
    const plan = planLifecycle(pkg, options['--target'], { operation, agents: options['--agents'], legacySource: options['--legacy-source'] });
    console.log(json({ operation, plan_id: plan.plan_id, preserved: plan.preserved, changes: plan.files.map((entry) => ({ path: entry.path, action: !entry.after ? 'remove' : entry.before ? 'replace' : 'create' })) }));
    if (options['--apply']) { applyLifecycle(plan, options['--expect-plan']); console.log('적용 완료. Git diff 검토 후 커밋/PR로 공유하세요. HEAD·인덱스·설정·승인은 바꾸지 않았습니다.'); }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error(`PETRA 수명주기 중단: ${e.message}`); process.exitCode = 1; }
}
