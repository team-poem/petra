# 승인 후 구현 검증

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
