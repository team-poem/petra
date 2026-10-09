# 혼합 연결 차단·sync 안내 구현 및 검증

## 승인과 적용 범위

사용자는 [2026-10-09 승인 기록](../../journal/2026-10-09-Kangmin_Kim-sobaya-mixed-mode-approved.md)의 11개 입력을 승인했다. `tests/sobaya-mixed-mode.sh`는 검토한 308줄·16,054바이트를 그대로 적용했다. SHA-256은 `cafb8d85a57cbb761e886f4f70a4e76d8381a5c245e0adf86236ce9ba0d303ce`다. 기존 설치형·구형 worktree 입력과 원래 세 스위트도 유지했다.

템플릿 자체에 가짜 앱 명세·승인 상태를 만들지 않았다. 기존 셸 유지보수 절차로 제품을 수정하고 검증했다. 임시 앱의 상태·worker·review fixture는 실제 소비자 앱의 승인이나 모델 성능을 뜻하지 않는다.

## 구현

- 구형 `attach|sync|update`는 현재 root pin과 공용 Git 디렉터리의 기본/linked checkout metadata를 먼저 확인한다. 설치형 기록이 있으면 앱 계약·소바야 source setup·pull 전에 중단하며 충돌 경로를 안내한다.
- marker의 존재 자체를 확인해 손상된 JSON이나 남은 연결 조각도 무시하지 않는다. symlink·디렉터리가 아닌 metadata는 점검을 요구하며, 정상 구형 state·lock만 있는 디렉터리는 계속 허용한다. 기존 연결·pin·상태를 자동 삭제하거나 이전하지 않는다.
- 독립 검토에서 상위 `CLAUDE_PROJECT_DIR`와 Git 저장소 환경변수 때문에 검사 대상과 실행 대상이 달라질 수 있음을 재현했다. 설치형 CLI와 동일하게 Git 로컬 환경변수를 제거하고, 단독 CLI의 대상 앱을 스크립트 위치로 고정했다. 공용 lib의 동작은 바꾸지 않았다.
- digest의 연결 확인 아래에 팀 pin 변경 후 `sh harness/sobaya-installed.sh sync --install-root STORE`를 안내한다. 연결 검사와 실행기 준비의 차이를 설명하며 자동 설치·업데이트·승인이나 추가 무거운 runtime 검증은 하지 않는다.
- CI와 유지보수 문서에 새 11개를 추가했다. 전체는 기존 180개 + 11개 = 191개다. 템플릿 버전 0.0.10은 기존 미출시 항목에 변경 기록을 보완했으며 새 릴리스를 만들지 않았다.

## 검증 증거

| 범위 | 결과 |
|---|---|
| 승인 전 실제 RED | 9개 혼합 연결 허용 + 1개 digest 안내 누락에서 실패. 정상 구형 대조군 1개 GREEN. 초안 지원 오류·중단된 실행은 근거에서 제외했다. |
| 최종 macOS Bash 3.2 / shlock | 84 + 48 + 32 + 7 + 9 + 11 = **191개 통과**. 세 실행 그룹 종료 코드 0. |
| 실행 입력 보존 | 최종 실행 전후 제품·CI·모든 tests/*.sh SHA-256 목록 일치. 승인 원문과 설치된 테스트 바이트 일치. |
| 독립 코드 검토 | 아래 최종 파일 해시의 소스·CI·문서를 검토해 남은 차단 사항 없음. 실제 커밋에 대한 마지막 결합 확인은 PR 본문에 기록한다. |
| 별도 환경 진단 | 상위 프로젝트 환경변수는 대상 앱을 바꾸지 못했고, Git 환경변수 조합에서도 실제 형제 연결을 찾아 변경 전에 중단했다. |
| dash 진단 | 잘못된 JSON, 부분 marker, 깨진 링크, 일반 파일 metadata, 깨진 root pin은 사전 거절. 구형 state·lock만 있는 metadata는 허용. |
| 정적·협업 검사 | 두 스크립트 sh 구문 검사·변경 diff 공백 검사·collab check 통과. 구형 어댑터 ShellCheck 오류 없음. collab.sh 전체 ShellCheck에는 수정 전에도 있던 62줄 SC2045가 남으며 이번 범위에서 수정하지 않았다. |
| Linux / flock | 동일 코드의 PR CI에서 전체 191개와 협업 검사를 실행한다. 실제 실행 ID·결과는 해당 커밋의 PR 본문·검사 링크를 기준으로 한다. 이 로컬 기록만으로 Linux 통과를 주장하지 않는다. |

최종 macOS 로그: `/private/tmp/poem-mixed-final-macos.mybhIE` (`base.log`, `installed.log`, `mixed.log`, 각 `.rc`, `inputs.before`, `inputs.after`). 검토 진단: `/private/tmp/poem-mixed-candidate-review.R0j6bD`.

검증한 주요 파일 SHA-256:

| 파일 | SHA-256 |
|---|---|
| `harness/attach-sobaya.sh` | `cc8003c725d58dfd739594e2336b274bbdbf97386cafccbde913c8a60cc9709a` |
| `scripts/collab.sh` | `4ea73ceff76fe2e4b47fd1751880a7729ce4c56cd3679cd5de18d60c67ed1109` |
| `.github/workflows/harness-check.yml` | `85ab948ed6cfb16a185f722a7906be006111474f1378bfeb07c799ace31c7b0d` |
| `tests/sobaya-installed.sh` | `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b` |
| `tests/sobaya-legacy-worktree.sh` | `d736cb05b581bf44f48918599053dffb6039cc8c57743d9255041d362e7d1b12` |
| `tests/sobaya-mixed-mode.sh` | `cafb8d85a57cbb761e886f4f70a4e76d8381a5c245e0adf86236ce9ba0d303ce` |

## 한계와 인수인계

사전 검사는 순차 실행의 보호이며 동시에 반대 모드를 연결하는 프로세스 사이의 트랜잭션 잠금은 아니다. 파일 스냅샷은 지정된 보호 상태를 확인하며 캐시·모든 일시적 쓰기를 감시하지 않는다. 환경·손상 metadata 진단의 설치기 sentinel은 대상 선택·조기 거절을 관찰하기 위한 것으로 실제 공개 설치기로 실행한 191개를 대체하지 않는다.

원래 소비자 사용 흐름, 모델 품질·비용, 진행 중 항목의 버전 간 재개나 자동 이전은 이번 검증에서 추가로 보장하지 않는다. PR의 최신 CI와 동료 재검토 후 병합을 판단한다. 이 기록은 병합·출시를 뜻하지 않는다.

## 회고

- Brain: 기존 관련 메모와 중복되므로 새 메모를 추가하지 않았다.
- Skills: 변경하지 않았다.
- Structural: 승인된 11개 회귀를 CI에 연결하고 대상 선택과 혼합 연결 사전 검사를 코드로 고정했다.
- Todos: 별도 범위를 새 작업으로 만들지 않았다.
