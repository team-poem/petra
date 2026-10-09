import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const equal = isDeepStrictEqual;
export const exists = (file) => { try { fs.lstatSync(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
export function git(root, ...args) {
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
  for (const key of Object.keys(env)) {
    if (/^GIT_(DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|PREFIX|CONFIG|CONFIG_COUNT|CONFIG_PARAMETERS|CONFIG_KEY_\d+|CONFIG_VALUE_\d+)$/.test(key)) delete env[key];
  }
  return execFileSync('git', ['-C', root, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
export function optionalGit(root, ...args) {
  try { return git(root, ...args); } catch (e) { if (e.status === 1) return ''; throw e; }
}
export function safePath(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || /[\x00-\x1f]/.test(relative) || relative.split('/').some((p) => !p || p === '.' || p === '..') || path.isAbsolute(relative)) throw new Error(`잘못된 상대 경로: ${relative}`);
  let file = root;
  const parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    file = path.join(file, parts[i]);
    if (!exists(file)) continue;
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || (i < parts.length - 1 && !stat.isDirectory())) throw new Error(`심링크 또는 비정상 부모 경로: ${relative}`);
  }
  return file;
}
export function snapshot(root, relative) {
  const file = safePath(root, relative);
  if (!exists(file)) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) throw new Error(`일반 파일이 아닙니다: ${relative}`);
  const bytes = fs.readFileSync(file);
  return { sha256: hash(bytes), mode: stat.mode & 0o777, bytes: bytes.toString('base64') };
}
export function repoInfo(target) {
  const root = fs.realpathSync(target);
  if (fs.realpathSync(git(root, 'rev-parse', '--show-toplevel')) !== root) throw new Error('--target은 Git 프로젝트 루트여야 합니다');
  const meta = fs.realpathSync(git(root, 'rev-parse', '--absolute-git-dir'));
  const common = fs.realpathSync(path.resolve(root, git(root, 'rev-parse', '--git-common-dir')));
  return { root, meta, common };
}
export function assertJoinable(root, { allowInstalledSobaya = false } = {}) {
  const { meta, common } = repoInfo(root);
  if (exists(path.join(meta, 'petra-install.lock'))) throw new Error('설치 중 또는 중단된 설치가 있습니다: Git 메타데이터의 petra-install.lock 확인');
  const old = optionalGit(root, 'config', '--get', 'core.hooksPath');
  let connected = false;
  if (allowInstalledSobaya && exists(path.join(meta, 'sobaya'))) {
    const saved = snapshot(meta, 'sobaya/connection.json');
    if (!saved) throw new Error('Sobaya 상태는 있지만 connection.json이 없습니다. 자동 초기화하지 않습니다');
    const connection = JSON.parse(Buffer.from(saved.bytes, 'base64'));
    if (typeof connection?.store !== 'string' || !path.isAbsolute(connection.store)) throw new Error('Sobaya 개인 저장소 경로가 잘못됐습니다');
    const adapter = safePath(root, '.petra/runtime/harness/sobaya-installed.sh');
    const status = JSON.parse(execFileSync('sh', [adapter, 'check', '--install-root', connection.store], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    if (status.connected !== true) throw new Error('Sobaya 연결을 확인하지 못했습니다');
    connected = true;
  }
  if (!connected && old && old !== '.githooks') throw new Error(`기존 hooksPath는 자동 연결하지 않습니다: ${old}`);
  for (const entry of exists(path.join(common, 'hooks')) ? fs.readdirSync(path.join(common, 'hooks'), { withFileTypes: true }) : []) {
    if (entry.name.endsWith('.sample')) continue;
    const file = path.join(common, 'hooks', entry.name);
    if (fs.lstatSync(file).isSymbolicLink() || (fs.statSync(file).mode & 0o111)) throw new Error(`기존 Git 훅은 수동 연결이 필요합니다: ${file}`);
  }
  if (meta !== common && optionalGit(root, 'config', '--bool', 'extensions.worktreeConfig') !== 'true') throw new Error('linked worktree의 join은 extensions.worktreeConfig=true 준비 후 실행하세요');
  // 설치 사전 검사는 엄격하게 유지한다. join만 검증된 현재 worktree 연결을 보존한다.
  if (!allowInstalledSobaya && (exists(path.join(meta, 'sobaya')) || exists(path.join(common, 'sobaya')))) throw new Error('기존 Sobaya 연결은 별도 이전 검증이 필요합니다');
  return { connected };
}
export const begin = '<!-- petra:begin -->';
export const end = '<!-- petra:end -->';
export function documentBlock(text) {
  if (text.split(begin).length !== 2 || text.split(end).length !== 2) throw new Error('PETRA 문서 구역이 없거나 중복됐습니다');
  const start = text.indexOf(begin), finish = text.indexOf(end);
  if (finish < start) throw new Error('PETRA 문서 구역 순서 오류');
  return text.slice(start, finish + end.length);
}
export function verifyInstalled(root, { duringInstall = false } = {}) {
  if (!duringInstall) {
    const { meta } = repoInfo(root);
    if (exists(path.join(meta, 'petra-install.lock'))) throw new Error('불완전 설치: petra-install.lock의 백업과 진단을 확인하세요');
  }
  const manifest = JSON.parse(Buffer.from(snapshot(root, '.petra/manifest.json')?.bytes || '', 'base64'));
  if (manifest.schema !== 1 || manifest.records !== '.petra/collab' || !Array.isArray(manifest.managed) || !manifest.managed.length) throw new Error('지원하지 않는 PETRA manifest');
  const seen = new Set();
  for (const entry of manifest.managed) {
    if (!/^(\.petra\/|\.githooks\/|\.claude\/)/.test(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256) || seen.has(entry.path)) throw new Error('잘못된 관리 파일 목록');
    seen.add(entry.path);
    const actual = snapshot(root, entry.path);
    if (!actual || actual.sha256 !== entry.sha256 || (entry.mode !== undefined && actual.mode !== entry.mode)) throw new Error(`PETRA 관리 파일 변경: ${entry.path}`);
  }
  for (const hook of ['pre-commit', 'pre-push', 'post-commit', 'pre-merge-commit']) {
    if (!(snapshot(root, `.githooks/${hook}`)?.mode & 0o111)) throw new Error(`Git 훅 실행 권한 없음: ${hook}`);
  }
  for (const entry of manifest.shared || []) {
    const text = Buffer.from(snapshot(root, entry.path)?.bytes || '', 'base64').toString();
    if (entry.kind === 'document') {
      if (documentBlock(text) !== entry.block) throw new Error(`PETRA 문서 구역 변경: ${entry.path}`);
    } else if (entry.kind === 'hooks') {
      const config = JSON.parse(text);
      if (config.disableAllHooks === true) throw new Error('Claude 훅이 disableAllHooks로 비활성화됐습니다');
      for (const [event, entries] of Object.entries(entry.hooks)) {
        for (const expected of entries) {
          if (config.hooks?.[event]?.filter((item) => equal(item, expected)).length !== 1) throw new Error(`PETRA 훅 항목 변경/중복: ${entry.path} ${event}`);
        }
      }
    } else throw new Error('알 수 없는 공유 파일 형식');
  }
  if (!snapshot(root, '.petra/config.sh')) throw new Error('프로젝트 설정 .petra/config.sh 없음');
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [, , command, target] = process.argv;
    const root = fs.realpathSync(target);
    if (command === 'verify') verifyInstalled(root);
    else if (command === 'join-check') assertJoinable(root, { allowInstalledSobaya: true });
    else throw new Error('알 수 없는 파일 검사 명령');
    console.log('PETRA 관리 파일과 공유 연결 검증 통과 (모델 동작·앱 테스트는 별도)');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
