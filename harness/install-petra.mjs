import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { hash, json, equal, exists, git, optionalGit, safePath, snapshot, repoInfo, assertJoinable, begin, end, verifyInstalled, managedForAgent } from './petra-files.mjs';

export const agentBlock = `${begin}\n## PETRA 협업\n작업 전에 [.petra/AGENTS.md](.petra/AGENTS.md)를 읽고 \`sh .petra/bin/petra digest --fetch\`를 실행한다.\n자동 훅이 없는 환경도 같은 CLI를 사용한다. 수정 후 \`pulse\`, 마무리에 새 저널과 \`check\`를 실행한다.\n처음 합류하면 \`sh .petra/bin/petra onboard\`. 협업 절차는 petra 스킬을 따른다. 구형 collab/·harness/ 경로 안내 대신 .petra/ 계약을 사용한다.\n앱 규칙과 실제 Test 명령은 이 문서의 기존 내용을 따른다.\n${end}`;

function preflight(info) {
  const { root, meta, common } = info;
  if (exists(path.join(meta, 'petra-install.lock'))) throw new Error(`설치 중 또는 중단된 설치: ${meta}/petra-install.lock`);
  assertJoinable(root);
  for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'index.lock']) {
    if (exists(path.join(meta, name))) throw new Error(`Git 작업 진행 중: ${name}`);
  }
  for (const name of ['collab', 'harness/config.sh', 'sobaya.json', 'sobaya.lock', 'harness/sobaya.lock']) {
    if (exists(path.join(root, name))) throw new Error(`기존 하네스/Sobaya 이전은 이번 설치 범위가 아닙니다: ${name}`);
  }
  const metadata = [meta, common];
  const worktrees = path.join(common, 'worktrees');
  if (exists(worktrees)) for (const name of fs.readdirSync(worktrees)) metadata.push(path.join(worktrees, name));
  for (const dir of metadata) if (exists(path.join(dir, 'sobaya'))) throw new Error(`기존 Sobaya 상태는 자동 변경하지 않습니다: ${dir}/sobaya`);
  const branch = git(root, 'symbolic-ref', '--short', 'HEAD');
  if (['main', 'master', 'develop'].includes(branch)) throw new Error('설치 전용 작업 브랜치에서 실행하세요 (main 직접 변경 금지)');
  return { branch, head: git(root, 'rev-parse', 'HEAD'), config: optionalGit(root, 'config', '--show-origin', '--show-scope', '--list'), index: exists(path.join(meta, 'index')) ? hash(fs.readFileSync(path.join(meta, 'index'))) : null };
}

export function planInstall(packageRoot, target, agents = 'both') {
  if (!['both', 'codex', 'claude'].includes(agents)) throw new Error('--agents는 both, codex, claude 중 하나입니다');
  const source = JSON.parse(fs.readFileSync(path.join(packageRoot, '.petra/manifest.json')));
  // 읽는 배포물은 방금 생성한 schema 1 pack이다. 설치된 앱을 업데이트 배포물로 쓰지 않는다.
  if (source.installation) throw new Error('설치된 앱이 아니라 제작 리포의 pack을 사용하세요');
  verifyInstalled(packageRoot, { duringInstall: true });
  const info = repoInfo(target), { root } = info;
  const state = preflight(info);
  const files = [], watched = {}, shared = [];
  const read = (name) => { watched[name] = snapshot(root, name); return watched[name]; };
  const add = (name, bytes, mode = 0o644) => {
    const before = read(name);
    const after = { bytes: Buffer.from(bytes).toString('base64'), sha256: hash(bytes), mode };
    files.push({ path: name, before, after });
  };
  const packaged = source.managed.filter((entry) => managedForAgent(entry, agents, root)).map((entry) => {
    const data = snapshot(packageRoot, entry.path);
    return { path: entry.path, ...data };
  });
  const packageId = hash(json({ files: packaged, config: snapshot(packageRoot, '.petra/config.sh'), hooks: snapshot(packageRoot, '.claude/settings.json'), agents }));
  const previous = read('.petra/manifest.json');
  if (previous) {
    const installed = verifyInstalled(root);
    if (installed.installation?.package_id !== packageId) throw new Error('다른 PETRA 배포물 또는 설치 옵션입니다. 업데이트/이전은 아직 지원하지 않습니다');
    for (const entry of installed.managed) read(entry.path);
    for (const entry of installed.shared || []) read(entry.path);
    read('.petra/config.sh');
  } else {
    if (exists(path.join(root, '.petra'))) throw new Error('manifest 없는 .petra가 있습니다. 기존 내용은 덮어쓰지 않습니다');
    if (git(root, 'status', '--porcelain', '--untracked-files=all')) throw new Error('설치 전 작업 트리와 인덱스를 커밋하거나 정리하세요. 자동 stash는 하지 않습니다');
    for (const entry of packaged) {
      if (read(entry.path)) throw new Error(`기존 파일은 수동 연결이 필요합니다: ${entry.path}`);
      add(entry.path, Buffer.from(entry.bytes, 'base64'), entry.mode);
    }
    add('.petra/config.sh', fs.readFileSync(path.join(packageRoot, '.petra/config.sh')));
    for (const kind of ['active', 'journal']) add(`.petra/collab/${kind}/README.md`, fs.readFileSync(path.join(packageRoot, `.petra/collab/${kind}/README.md`)));
    const prior = read('AGENTS.md');
    const text = prior ? Buffer.from(prior.bytes, 'base64').toString() : '';
    if (text.includes(begin) || text.includes(end)) throw new Error('기존 AGENTS.md에 관리 이력이 없는 PETRA 구역이 있습니다');
    add('AGENTS.md', `${text}${text ? '\n\n' : ''}${agentBlock}\n`, prior?.mode ?? 0o644);
    shared.push({ path: 'AGENTS.md', kind: 'document', block: agentBlock });
    if (agents !== 'codex') {
      const file = '.claude/settings.json', old = read(file);
      const config = old ? JSON.parse(Buffer.from(old.bytes, 'base64')) : {};
      if (!config || Array.isArray(config) || typeof config !== 'object' || config.disableAllHooks === true) throw new Error('Claude 설정이 객체가 아니거나 훅이 비활성화됐습니다');
      if (config.hooks !== undefined && (!config.hooks || Array.isArray(config.hooks) || typeof config.hooks !== 'object')) throw new Error('Claude hooks 구조를 자동 병합할 수 없습니다');
      const hooks = JSON.parse(fs.readFileSync(path.join(packageRoot, file))).hooks;
      config.hooks ??= {};
      for (const [event, entries] of Object.entries(hooks)) {
        const existing = config.hooks[event] ?? [];
        if (!Array.isArray(existing) || JSON.stringify(existing).includes('.petra/')) throw new Error(`기존 PETRA 훅 또는 알 수 없는 훅 구조: ${event}`);
        config.hooks[event] = [...existing, ...entries];
      }
      add(file, json(config), old?.mode ?? 0o644);
      shared.push({ path: file, kind: 'hooks', hooks });
    }
    const managed = packaged.map(({ path: name, sha256, mode }) => ({ path: name, sha256, mode }));
    add('.petra/manifest.json', json({ ...source, managed, shared, installation: { package_id: packageId, agents } }));
    const ignored = optionalGit(root, 'check-ignore', '--', ...files.map((entry) => entry.path));
    if (ignored) throw new Error(`설치 파일이 Git에서 제외됩니다. .gitignore를 먼저 검토하세요:\n${ignored}`);
  }
  const material = { target: root, package_id: packageId, state, watched, files };
  return { ...material, info, plan_id: hash(json(material)) };
}

export function applyInstall(plan, expected, { beforeWrite = () => {}, afterWrite = () => {}, preflightCheck = preflight, verify = (root) => verifyInstalled(root, { duringInstall: true }) } = {}) {
  if (!expected || expected !== plan.plan_id) throw new Error('계획이 다릅니다. dry-run 후 --expect-plan <plan_id>로 적용하세요');
  if (!plan.files.length) return;
  if (!equal(preflightCheck(plan.info), plan.state)) throw new Error('계획 이후 Git 상태나 설정 변경');
  const { root, meta } = plan.info, lock = path.join(meta, 'petra-install.lock');
  fs.mkdirSync(lock, { mode: 0o700 });
  const written = [], createdDirs = [];
  const backup = path.join(lock, 'backup.json');
  const save = () => fs.writeFileSync(backup, json({ target: root, plan_id: plan.plan_id, files: plan.files, written, createdDirs }), { mode: 0o600 });
  function parents(relative) {
    const parts = relative.split('/').slice(0, -1);
    for (let i = 1; i <= parts.length; i++) {
      const dir = parts.slice(0, i).join('/'), target = safePath(root, dir);
      if (!exists(target)) { createdDirs.push(dir); save(); fs.mkdirSync(target); }
    }
  }
  function replace(entry, value) {
    const file = safePath(root, entry.path);
    if (!value) { fs.unlinkSync(file); return; }
    const temp = path.join(path.dirname(file), `.petra-write-${process.pid}`);
    let created = false;
    let descriptor;
    try {
      descriptor = fs.openSync(temp, 'wx', value.mode);
      created = true;
      fs.writeFileSync(descriptor, Buffer.from(value.bytes, 'base64'));
      fs.fchmodSync(descriptor, value.mode);
      fs.closeSync(descriptor); descriptor = undefined;
      fs.renameSync(temp, file);
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
      if (created && exists(temp)) fs.unlinkSync(temp);
    }
  }
  try {
    save();
    for (const [name, expectedState] of Object.entries(plan.watched)) if (!equal(snapshot(root, name), expectedState)) throw new Error(`계획 이후 파일 변경: ${name}`);
    for (const entry of plan.files) {
      beforeWrite(entry);
      if (!equal(snapshot(root, entry.path), entry.before)) throw new Error(`적용 중 파일 변경: ${entry.path}`);
      parents(entry.path);
      // 변경 전에 복구 정보를 기록한다. 강제 종료 시 join/verify가 lock을 보고 중단한다.
      written.push(entry.path); save();
      replace(entry, entry.after);
      afterWrite(entry);
    }
    verify(root);
    fs.rmSync(lock, { recursive: true });
  } catch (error) {
    const unresolved = [];
    for (const name of [...written].reverse()) {
      const entry = plan.files.find((item) => item.path === name);
      try {
        const current = snapshot(root, name);
        if (equal(current, entry.before)) continue;
        if (!equal(current, entry.after)) { unresolved.push(name); continue; }
        replace(entry, entry.before);
      } catch { unresolved.push(name); }
    }
    for (const dir of [...createdDirs].reverse()) {
      try { fs.rmdirSync(safePath(root, dir)); } catch { /* 사용자가 추가한 파일이 있으면 디렉터리를 남긴다. */ }
    }
    if (unresolved.length) {
      save();
      throw new Error(`${error.message}\n동시 변경은 보존했습니다: ${unresolved.join(', ')}\n수동 복구 자료: ${backup}`);
    }
    fs.rmSync(lock, { recursive: true });
    throw new Error(`${error.message}\n이번 설치 변경은 복구했습니다`);
  }
}

function main() {
  const args = process.argv.slice(2), options = {};
  while (args.length) {
    const key = args.shift();
    if (key === '--dry-run' || key === '--apply') options[key] = true;
    else if (['--source', '--target', '--agents', '--expect-plan'].includes(key) && args.length) options[key] = args.shift();
    else throw new Error(`알 수 없거나 값이 없는 옵션: ${key}`);
  }
  if (!options['--source'] || !options['--target'] || Boolean(options['--dry-run']) === Boolean(options['--apply'])) throw new Error('install --target <Git 루트> --dry-run | --apply --expect-plan <id> [--agents both|codex|claude]');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'petra-install-'));
  try {
    const pkg = path.join(tmp, 'package');
    execFileSync('sh', [path.join(options['--source'], 'harness/package-petra.sh'), pkg], { stdio: ['ignore', 'pipe', 'pipe'] });
    const plan = planInstall(pkg, options['--target'], options['--agents'] || 'both');
    console.log(json({ target: plan.target, plan_id: plan.plan_id, changes: plan.files.map((entry) => ({ path: entry.path, action: entry.before ? 'connect' : 'create' })), preserved: ['앱 코드/README/Test 명령', '기존 사용자 설정', 'Git HEAD/인덱스/config/원격'], agents: options['--agents'] || 'both' }));
    if (options['--apply']) {
      applyInstall(plan, options['--expect-plan']);
      console.log(plan.files.length ? '설치 완료. diff를 검토하고 커밋한 뒤 sh .petra/bin/petra join <핸들>로 합류하세요. 자동 commit/push는 하지 않았습니다.' : '같은 설치가 이미 준비됐습니다. 파일·설정을 변경하지 않았습니다.');
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error(`PETRA 설치 중단: ${e.message}`); process.exitCode = 1; }
}
