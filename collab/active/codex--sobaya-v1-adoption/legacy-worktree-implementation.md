# 구형 worktree 연결 회귀 구현·검증

2026-10-08 사용자는 [검토본](legacy-worktree-review.md)의 정확한 일곱 테스트와 정상 sync의 종료 코드 0 기준을 승인했다. [승인 기록](../../journal/2026-10-08-Kangmin_Kim-sobaya-legacy-approved.md)에 따라 `tests/sobaya-legacy-worktree.sh`에 원문을 그대로 추가했다.

## 변경된 동작

- 새 worktree에서 구형 attach·sync·update가 공통·worktree 설정 파일을 그대로 두고 동작한다. Git 명령 범위 옵션이 설치기에만 앱 내부 임시 훅 경로를 전달한다.
- 실제 공용 위치의 사용자 훅·심링크는 설치 전과 게시 직전에 검사한다. 기존의 정상 hooks 디렉터리 심링크는 유지하며, dangling 디렉터리는 변경하지 않고 거절한다.
- 설치기가 성공한 실행 가능한 관리 훅만 최종 hooks 디렉터리의 임시 위치로 복사한 뒤 게시한다. 동일한 실행 가능 훅은 다시 쓰지 않는다.
- 설치·게시 실패를 상위 명령으로 전달하여 루트 세션 어댑터나 성공 lock을 기록하지 않는다. 정상·오류 종료 시 임시 디렉터리를 정리한다.
- 정상 sync가 마지막 경고 조건의 false 값을 종료 코드로 돌려주던 기존 오류도 수정했다.
- 소바야 자체나 설치형 연결 구현은 바꾸지 않았다. 템플릿 버전은 이 PR의 미출시 `0.0.10`에 수정 사항을 포함한다.

## 승인 입력 보존

| 입력 | SHA-256 |
|---|---|
| 새 구형 회귀 테스트와 검토 원문 | `d736cb05b581bf44f48918599053dffb6039cc8c57743d9255041d362e7d1b12` |
| 기존 설치형 v3 입력과 승인 원문 | `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b` |

기존 hooks·loop·sobaya 세 스위트와 설치형 스위트는 `9d8019d`에서 변경하지 않았다. DRAFT 주석도 승인 원문에 포함되어 있어 그대로 보존하며 승인 여부는 별도 기록을 따른다.

## macOS 및 독립 검토

승인 파일을 추가한 `bcbeae87adc3697eafb06c7ba5e00c7dc743e89b`와 구현 후보에서 전체 **84 + 48 + 32 + 9 + 7 = 180개**를 통과했다. Bash 3.2와 `/usr/bin/shlock`을 사용했다. 협업 검사, `sh -n`, `shellcheck -S error`, `git diff --check`도 통과했다.

검증한 `harness/attach-sobaya.sh` SHA-256은 `4756bbcb8eb592d579f76a43329174b663dfef3616af49b205a1358a62f70205`다. 원문 해시·후보 diff·각 스위트 로그는 `/private/tmp/poem-legacy-full-macos.EKBrny`에 남겼다. 커밋 전 후보 실행이므로 이후 커밋과의 일치는 실행 코드 해시로 확인한다.

독립 리뷰는 같은 설치 스크립트 해시와 승인 테스트 보존을 확인했고 수정할 결함을 찾지 못했다. 별도 임시 저장소에서 정상 hooks 디렉터리 심링크, dangling 디렉터리 거절, 게시 단계의 mv 실패를 추가 확인했다. 실패 시 어댑터·pin 미실행과 임시 경로 정리도 확인했다. 증거는 `/private/tmp/poem-legacy-implementation-review.TmuuzJ`와 `/private/var/folders/wv/lv2qb3z92074bwd0pncsq3100000gn/T/poem-legacy-draft.hD0Lwo`다.

## 남은 최종 확인

Linux CI에 같은 공개 소스 커밋의 실제 설치기를 사용하는 일곱 항목을 연결했다. 현재 이 기록 시점에는 새 CI 결과와 최종 PR 커밋에 대한 완료 검토가 남아 있다. 통과 후 별도 인수인계 저널과 PR 검증 항목에 실행 URL·revision을 기록한다. 기존 173개 통과만으로 이 회귀를 해결했다고 판단하지 않는다.

한계: 관찰 래퍼로 임시 소스 clone을 변경하므로 새 테스트의 네트워크 pull은 생략된다. 강제 종료·전원 중단이나 외부 프로세스가 동시에 훅을 교체하는 상황을 검증한 결과는 아니다. 실제 소비자 앱의 테스트 승인·유료 모델 실행·병합·출시는 별도다.

## 회고

Brain: 기존 `thin-shell-needs-a-refuter` 원칙과 같은 교훈이므로 중복 메모는 추가하지 않았다.  
Skills: 변경 없음.  
Structural: 실제 공개 설치기와 협업 worktree의 조합, 호출 중 설정 보존, 실행 가능한 훅 전달을 승인 테스트와 CI에 추가했다.  
Todos: 별도 항목 추가 없음. 남은 CI·완료 검토는 현재 PR에서 마친다.
