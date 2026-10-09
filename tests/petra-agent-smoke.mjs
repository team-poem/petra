// Explicit opt-in: this invokes authenticated local model CLIs, never in CI.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [, , tool, appArg, outputArg] = process.argv;
if (!['codex', 'claude'].includes(tool) || !appArg || !outputArg) throw new Error('node tests/petra-agent-smoke.mjs codex|claude <fixture app> <new evidence directory>');
const app = fs.realpathSync(appArg), output = path.resolve(outputArg);
if (!app.includes(`${path.sep}.petra-lab${path.sep}`)) throw new Error('이 도구는 내부 실험실 fixture에서만 실행합니다');
fs.mkdirSync(output, { recursive: false });
const prompt = '이 테스트 프로젝트에서 작업을 시작하기 전에 PETRA 협업 계약을 읽고 동료 현황을 확인해줘. 동료가 지금 무엇을 하는지, 내가 작업 전에 확인할 것은 무엇인지 한국어로 설명해줘. 코드/문서/Git 설정은 고치지 말고 커밋이나 push도 하지 마. 다른 에이전트를 호출하지 마. 조회 실패나 오래된 정보를 작업 없음으로 판단하지 마.';
const args = tool === 'codex'
  ? ['exec', '--ephemeral', '-s', 'workspace-write', '--add-dir', path.dirname(app), '--add-dir', path.join(app, '.git'), '--json', prompt]
  : ['-p', '--no-session-persistence', '--setting-sources', 'project', '--permission-mode', 'dontAsk', '--tools', 'Read,Bash', '--allowedTools', 'Read,Bash(sh .petra/bin/petra digest*)', '--strict-mcp-config', '--max-budget-usd', '1', '--output-format', 'stream-json', '--verbose', '--include-hook-events', prompt];
const env = { ...process.env };
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'CLAUDE_PROJECT_DIR', 'PETRA_PROJECT_ROOT', 'RUNTIME_ROOT', 'NODE_TEST_CONTEXT']) delete env[key];
const result = spawnSync(tool, args, { cwd: app, env, encoding: 'utf8', timeout: 150_000, killSignal: 'SIGTERM', maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(output, 'stdout.jsonl'), result.stdout || '');
fs.writeFileSync(path.join(output, 'stderr.log'), result.stderr || '');
fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ tool, app, exit_code: result.status, signal: result.signal, error: result.error?.code ?? null, note: 'Exit status alone does not prove agent understanding; inspect tool calls, hook events and answer.' }, null, 2));
console.log(JSON.stringify({ tool, evidence: output, exit_code: result.status, signal: result.signal, error: result.error?.code ?? null }));
process.exitCode = result.status === 0 ? 0 : 1;
