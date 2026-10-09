import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { git, hash, json, safePath } from './petra-files.mjs';

function fileRecord(root, name) {
  const parent = path.dirname(name) === '.' ? root : safePath(root, path.dirname(name));
  const file = path.join(parent, path.basename(name));
  if (path.isAbsolute(name) || name.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('잘못된 소스 경로');
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) return { path: name, link: fs.readlinkSync(file) };
  if (!stat.isFile()) throw new Error(`일반 소스 파일 아님: ${name}`);
  return { path: name, sha256: hash(fs.readFileSync(file)), mode: stat.mode & 0o777 };
}
export function archiveProvenance(root) {
  const files = git(root, 'ls-files', '-z').split('\0').filter(Boolean).map((name) => fileRecord(root, name));
  return { schema: 1, source_commit: git(root, 'rev-parse', 'HEAD'), version: fs.readFileSync(path.join(root, 'harness/VERSION'), 'utf8').trim(), files };
}
export function sourceStatus(root) {
  root = fs.realpathSync(root);
  let top;
  try { top = fs.realpathSync(git(root, 'rev-parse', '--show-toplevel')); } catch { /* Source archives have no .git. */ }
  if (top === root) return { source_commit: git(root, 'rev-parse', 'HEAD'), source_dirty: Boolean(git(root, 'status', '--porcelain')) };
  const proof = JSON.parse(fs.readFileSync(path.join(root, '.petra-source.json')));
  if (proof.schema !== 1 || !/^[a-f0-9]{40}$/.test(proof.source_commit) || !Array.isArray(proof.files) || !proof.files.length) throw new Error('소스 압축파일 출처 정보가 없습니다');
  let dirty = proof.version !== fs.readFileSync(path.join(root, 'harness/VERSION'), 'utf8').trim();
  for (const entry of proof.files) {
    try { if (JSON.stringify(fileRecord(root, entry.path)) !== JSON.stringify(entry)) dirty = true; }
    catch { dirty = true; }
  }
  return { source_commit: proof.source_commit, source_dirty: dirty };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(json(sourceStatus(process.argv[2]))); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
