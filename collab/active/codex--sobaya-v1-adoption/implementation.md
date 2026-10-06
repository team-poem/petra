# 승인 후 구현 검증

## 현재 완료 경계 (2026-10-06)

| 증거 | 결과·범위 |
|---|---|
| 기존 승인 세 스위트 | macOS 84+48+32, Linux `e947b10` 84+48+32 통과. 기존 테스트·구형 어댑터 바이트 보존 |
| 원본 신규 입력 `daf61fe2…` | attach·sync·bump·busy·run·공개 사이클 항목 통과. busy는 실제 macOS shlock과 Linux flock 각각 확인 |
| 원본 나머지 3항목 | `.git/hooks` 누락 또는 fixture main push의 정상적인 보호 훅 거절로 준비 단계에서 중단. 제품 실패/성공으로 계산하지 않음 |
| v3 제안 `f264e753…` | macOS 및 Linux `e947b10`의 아홉 항목 전체 참고 probe 통과. 미승인 입력이므로 합격 기준이 아님 |
| 독립 코드 검토 | `fc7ec9a`에서 남은 실행 가능한 지적 없음. 발견한 메타데이터 JSON stream 오류 수정 및 독립 변조 재검증 완료 |
| 후속 metadata 수정 검증 | 원본 attach와 독립 malformed JSON probe 통과. Linux 전체 기록은 이 수정 이전 `e947b10`에 한정 |
| CI | 기존 workflow의 세 스위트·협업 검사 통과. 설치형 추가 단계는 `proposed-harness-check.yml`로 준비했으며 아직 활성 workflow가 아님 |

Linux 증거: `/private/tmp/poem-linux-validation.kymPii/RESULTS-e947b10.md`, `checkpoint-e947b10.log`. macOS v3 전체 증거: `/private/tmp/poem-v1-v3-macos-all.log`. 독립 오류 재검증: `/private/tmp/poem-installed-draft.SUxRpZ`. Linux 전용 VM은 종료했고 기본 Docker context를 유지했다.

다음은 v3 정확한 교체본의 사람 승인이다. 승인되면 `tests/sobaya-installed.sh`에 그대로 적용하고 승인 기록을 남긴 뒤 준비된 CI를 연결한다. 최종 revision에서 macOS·Linux 전체 스위트와 협업 검사를 수행하고 PR #5를 ready로 전환한다. 승인 전에는 PR을 draft로 유지한다. 실제 사용자 앱의 승인·유료 모델·배포·병합은 수행하지 않았다.

## 독립 구현 검토

- 연결·원래 훅 메타데이터가 JSON 여러 문서여도 마지막 문서만으로 정상 처리되는 문제를 독립 리뷰가 재현했다. `jq -s`로 정확히 객체 한 개만 받도록 수정했다. 원본 연결 항목과 두 메타데이터 변조 probe가 재통과했다.
- 전달 훅 바이트·공백/작은따옴표 경로·변조 거절·legacy 충돌·pin 경계를 검토했다. 실행 가능한 `*.sample` 원본은 공개 v1처럼 무시한다.
- 별도 reviewer의 실제 shlock·sibling worktree·일반 clone probe에서 새 차단 문제는 없었다. 공유 collab.me 설정은 기존 동작이며 이번 범위에서 변경하지 않았다.
- 교체본 승인과 Linux 실행은 코드 리뷰와 별도의 완료 조건이다.

## 워크트리 통합 — 교체 입력 승인 전 참고 검증

- v3 worktree probe는 sibling이 원래 전달 훅을 상속해 RED였다. 새 worktree에만 `--worktree core.hooksPath=.githooks`를 지정하여 통과했다. 원래 승인·훅 보존 및 새 연결의 root/app 분리를 확인했다.
- 기존 소스 모드의 미설정 저장소도 worktree를 만들 수 있어야 한다. 최초 구현의 과도한 거절은 기존 sobaya 스위트의 1개 실패로 드러났고, 특수 `core.worktree`·`core.bare=true`·기존 설치 연결이 없는 경우에만 worktreeConfig를 켜도록 수정했다. 공유 hooksPath는 변경하지 않는다. 기존 32개 재통과.
- 기존 hooks 84, loop 48도 통과. v3 아홉 항목 전체 macOS probe 통과 후 위 legacy 조정의 관련 항목도 재통과했다. v3는 여전히 사람 승인 대기이며 전체 합격 기준으로 주장하지 않는다.

승인된 원본 SHA-256: `daf61fe2d54c8f82558e6de342053f34ce0a533878c8859663cc0eb24e627871`. 기존 세 테스트 파일도 보존한다.

## 연결 훅 통합 — 교체 입력 승인 전 참고 검증

- join·init은 기존 연결을 읽기 전용으로 확인하고 전달 훅을 유지한다. 충돌한 연결은 덮어쓰지 않는다. 설치형 pin이 있으면 부모 소스 클론을 추천하지 않는다.
- state·digest는 설치형 전달 훅을 인식한다. v3 제안본의 hooks 항목은 상태 표시 RED에서 통과로 바뀌었다. 실제 커밋의 사용자 훅·린트 각각 한 번, 사용자 훅 실패 시 중단, 협업 실패 시 모두 미실행을 확인했다.
- 이 참고 probe는 교체본 승인을 대신하지 않는다. 승인된 실행 원본은 변경하지 않았다.
- 기존 전체 스위트 hooks 84, loop 48, sobaya 32 통과.

## 체크포인트 4 — 실제 잠금 소유자

- 원본 `busy_tracks_live_locks`는 죽은 PID의 파일을 busy로 판단하여 RED였다.
- 실행 잠금·관리 잠금의 실제 소유자를 검사하도록 수정했다. macOS shlock의 살아 있는 소유자·죽은 소유자와 active 상태가 원본 항목에서 통과했다. 파일을 지우거나 쓰지 않는다.
- Linux flock 분기는 별도 실행 전까지 미검증이다.
- 기존 전체 스위트 hooks 84, loop 48, sobaya 32 통과.

## 체크포인트 1 — 연결과 읽기 전용 상태

- 시작: 어댑터가 없어 `attach_preserves_app`은 NOT PROBED(exit 2). 제품 RED로 계산하지 않았다.
- 구현 후 원본 `attach_preserves_app` 통과: 공개 버전·pin, 파일·인덱스·상태 보존, 반복 연결, 연결 변조 거절.
- 기존 전체 스위트: hooks 84, loop 48, sobaya 32, 실패 0.

## 체크포인트 3 — 후보 bump

- 원본 bump 항목: 미구현 명령 거절을 확인한 뒤 공개 CLI의 bump에 위임했다.
- 원본 `bump_validates_and_preserves_state` 통과: 후보 전체 스위트·린트 실행, 실패 pin 복원, active 거절, 승인 상태·호출 수·HEAD·훅·기존 파일 보존.
- 기존 전체 스위트 hooks 84, loop 48, sobaya 32 통과. 실행 중 작업과 충돌 경계 및 공개 fixture 사이클 원본 항목도 통과했다.
- 추가 준비 결함: 원본 worktree 항목의 로컬 main 준비 push가 정상적인 보호 훅에 막혔다. v3 검토안은 훅 디렉터리 생성과 이 준비 push의 명시적 우회만 제안한다. 실제 제품 검사에는 훅이 유지된다. 제안본 probe는 정상 충돌 거절, hook 상태 표시 RED, sibling 훅 상속 RED까지 도달했다. 승인 전 합격 기준으로 세지 않는다.
- `attach_rejects_conflicts`는 세 번째 임시 저장소의 훅 디렉터리가 없어 준비 단계에서 중단됐다. 제품 결과가 아니다. `review-v2.md`에 한 줄 보완을 제안했으며 승인 전에는 원본 테스트를 교체하지 않는다.
- 아직 sync·bump·join·worktree·busy 구현과 전체 아홉 항목 검증이 남았다. 전체 완료를 주장하지 않는다.

## 체크포인트 2 — 명세 없는 main의 정확한 설치 복원

- 원본 `sync_restores_exact_pin_without_plans`: join에 명시적 sync 안내가 없어 RED. 안내와 공개 CLI 위임 구현 후 통과했다.
- 빈 저장소의 신뢰 CLI 지정, 정확한 공개 매니페스트, pin·훅·Git 설정 보존, 반복 sync와 연결 전 상태를 검증했다.
- 독립 검토에서 연결 훅의 marker만 검사하는 허점과 비디렉터리 메타데이터를 발견했다. 공개 v1 전달 훅의 정확한 바이트와 필수 pre-commit, 메타데이터 디렉터리를 읽기 전용으로 확인하도록 보완했다. 원본 첫 항목 재통과.
- 기존 전체 스위트: hooks 84, loop 48, sobaya 32, 실패 0.
