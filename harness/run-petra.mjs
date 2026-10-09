// Worker lifetime owns sharing. The sidecar never commits or synchronizes HEAD.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , cli, separator, command, ...args] = process.argv;
const seconds = Number(process.env.PETRA_WORKER_SHARE_SEC || 60);
if (separator !== '--' || !command || !Number.isInteger(seconds) || seconds < 1 || seconds > 3600) {
  console.error('run: 명령과 1~3600초 공유 간격이 필요합니다.');
  process.exit(1);
}
let sharing, timer, killTimer, stopped = false, signalCode;
const metadata = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { encoding: 'utf8' }).trim();
const lock = path.join(metadata, 'petra-run.lock');
try {
  fs.mkdirSync(lock);
  fs.writeFileSync(path.join(lock, 'pid'), `${process.pid}\n`);
} catch {
  console.error(`워커가 실행 중이거나 이전 실행이 중단됐습니다: ${lock}. 소유 PID와 작업 상태를 확인하세요.`);
  process.exit(1);
}
process.on('exit', () => {
  try {
    if (fs.readFileSync(path.join(lock, 'pid'), 'utf8').trim() === `${process.pid}`) {
      fs.unlinkSync(path.join(lock, 'pid')); fs.rmdirSync(lock);
    }
  } catch { /* Do not remove a lock replaced by another process. */ }
});
const groupSignal = (child, signal) => {
  if (!child?.pid) return;
  try { process.kill(-child.pid, signal); } catch (e) { if (e.code !== 'ESRCH') throw e; }
};
const share = () => {
  if (stopped || sharing) return;
  sharing = spawn('sh', [cli, 'share'], { stdio: ['ignore', 'ignore', 'inherit'], detached: true });
  sharing.on('error', (e) => console.error(`PETRA 공유 실행 실패: ${e.message}`));
  sharing.on('close', () => { sharing = undefined; });
};
const worker = spawn(command, args, { stdio: 'inherit', detached: true });
worker.on('error', (e) => console.error(`워커 실행 실패: ${e.message}`));
share();
timer = setInterval(share, seconds * 1000);
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]]) {
  process.on(signal, () => {
    signalCode = code;
    stopped = true;
    clearInterval(timer);
    groupSignal(worker, signal);
    groupSignal(sharing, signal);
    killTimer ??= setTimeout(() => { groupSignal(worker, 'SIGKILL'); groupSignal(sharing, 'SIGKILL'); }, 3000);
  });
}
worker.on('close', (code, signal) => {
  stopped = true;
  clearInterval(timer);
  // Give an in-flight bounded share time to finish and release its lock.
  if (sharing) sharing.once('close', finish);
  else finish();
  function finish() { clearTimeout(killTimer); process.exitCode = signalCode ?? code ?? (signal ? 1 : 0); }
});
