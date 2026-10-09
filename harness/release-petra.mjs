import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { git, hash, json, verifyInstalled } from './petra-files.mjs';

export function buildRelease(root, output) {
  root = fs.realpathSync(root); output = path.resolve(output);
  output = path.join(fs.realpathSync(path.dirname(output)), path.basename(output));
  if (output === root || output.startsWith(`${root}${path.sep}`)) throw new Error('배포 출력은 제작 리포 밖의 새 디렉터리로 지정하세요');
  if (git(root, 'status', '--porcelain', '--untracked-files=all')) throw new Error('커밋 전 변경이 있어 정식 배포물을 만들지 않습니다');
  const version = fs.readFileSync(path.join(root, 'harness/VERSION'), 'utf8').trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('정식 배포 버전이 아닙니다');
  const commit = git(root, 'rev-parse', 'HEAD');
  fs.mkdirSync(output);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'petra-release-'));
  try {
    const pkg = path.join(temp, 'package');
    execFileSync('sh', [path.join(root, 'harness/package-petra.sh'), pkg], { stdio: 'pipe' });
    const manifest = verifyInstalled(pkg, { duringInstall: true });
    if (manifest.version !== version || manifest.source_commit !== commit || manifest.source_dirty) throw new Error('배포 manifest의 출처가 HEAD와 다릅니다');
    const runtime = `petra-${version}.tar.gz`, source = `petra-${version}-source.tar.gz`;
    execFileSync('tar', ['-czf', path.join(output, runtime), '-C', pkg, '.']);
    execFileSync('git', ['-C', root, 'archive', '--format=tar.gz', `--output=${path.join(output, source)}`, 'HEAD']);
    fs.writeFileSync(path.join(output, 'manifest.json'), json(manifest));
    const checksums = Object.fromEntries([runtime, source, 'manifest.json'].map((file) => [file, hash(fs.readFileSync(path.join(output, file)))]));
    fs.writeFileSync(path.join(output, 'SHA256SUMS'), Object.entries(checksums).map(([file, sum]) => `${sum}  ${file}\n`).join(''));
    return { version, source_commit: commit, output, checksums };
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--output') throw new Error('node harness/release-petra.mjs --output <리포 밖의 새 경로>');
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    console.log(json(buildRelease(root, process.argv[3])));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
