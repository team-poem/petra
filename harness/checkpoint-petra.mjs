import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { git, safePath } from './petra-files.mjs';

const [, , root, cli, flag, message, separator, ...files] = process.argv;
try {
  if (flag !== '--message' || !message?.trim() || separator !== '--' || !files.length) throw new Error('checkpoint --message "검증한 변경" -- <파일...>');
  if (git(root, 'diff', '--cached', '--name-only')) throw new Error('이미 스테이지된 변경이 있습니다. 사용자의 인덱스에 섞지 않습니다.');
  for (const file of files) {
    const absolute = safePath(root, file);
    if (file.startsWith(':') || file === '.' || (fs.existsSync(absolute) && !fs.statSync(absolute).isFile())) throw new Error(`파일을 명시하세요 (폴더/pathspec 금지): ${file}`);
    execFileSync('sh', [cli, 'guard', absolute], { cwd: root, stdio: 'inherit' });
  }
  git(root, '--literal-pathspecs', 'add', '--', ...files);
  const agent = process.env.COLLAB_AGENT_NAME || 'AI agent';
  if (/[\r\n]/.test(agent)) throw new Error('COLLAB_AGENT_NAME에는 한 줄 모델명만 넣으세요');
  execFileSync('git', ['-C', root, 'commit', '-m', message, '-m', `Assisted-by: ${agent}`], { stdio: 'inherit' });
} catch (e) {
  console.error(`체크포인트 중단: ${e.message}\n자동 되돌리기는 하지 않았습니다. git status로 인덱스와 커밋을 확인하세요.`);
  process.exitCode = 1;
}
