# 소바야 v1 설치형 연결 — 검토 초안

상태: 테스트 승인 대기. 이 문서와 실행 초안은 기능 구현 완료나 실제 프로젝트의 테스트 승인을 뜻하지 않는다.

기존 프로젝트와 이 템플릿으로 만든 프로젝트가 소바야를 정확한 출시 버전으로 설치하고, 협업 규칙을 유지하면서 실행·동기화·bump할 수 있게 한다. 소바야는 승인된 테스트의 구현·검증을, Poem은 작업 선언·충돌 관리·인수인계를 담당한다.

기준은 [AGENTS.md §8](../../../AGENTS.md), [소바야 연동 규칙](../../../harness/sobaya/RULES.md), [기여 절차](../../../CONTRIBUTING.md)다. 템플릿 자체의 셸 테스트는 기존 방식으로 실행한다. 템플릿 이슈 #4의 폴더 재배치·라이브러리화·명명은 이 PR에서 결정하지 않는다.

## 승인할 파일

- [실행 가능한 테스트 초안](draft-installed-tests.sh): 승인 후 `tests/sobaya-installed.sh`에 그대로 옮길 입력.
- [전체 `┎` 검토본](review.md): 공통 준비 코드와 아홉 항목 전체. 추가 설명 줄만 지우면 실행 초안과 바이트가 같아야 한다.
- [검증 기록](validation.md): 초안·대조군·기존 코드의 실패·환경 한계를 구분한다.

기존 `tests/hooks.sh`, `tests/loop.sh`, `tests/sobaya.sh`와 실제 프로젝트의 `AGENTS.md`, 명세, 승인된 테스트는 수정하지 않는다. 새 초안 승인은 이 연결 기능의 테스트 입력에만 적용된다.

## 제안하는 명령

기존 `harness/attach-sobaya.sh`의 소스 클론 연결을 유지하고, 설치형 연결은 별도 명령으로 명시한다.

```sh
# 신뢰한 공개 설치기로 런타임을 먼저 설치한 뒤, 현재 프로젝트에 연결한다.
sh harness/sobaya-installed.sh attach --install-root "$store" --version 1.0.0-rc.1

# root lock의 정확한 버전을 복원한다. --archive를 생략하면 소바야의 고정 다운로드 경로를 쓴다.
sh harness/sobaya-installed.sh sync --install-root "$store" --archive "$archive"

# 설치 저장소가 비어 있으면 별도로 확보한 신뢰한 CLI를 명시한다.
sh harness/sobaya-installed.sh sync --install-root "$new_store" --cli "$trusted_cli" --archive "$archive"

# 검토한 후보를 전체 앱 테스트·린트로 검증하고 두 pin 파일의 변경을 남긴다.
sh harness/sobaya-installed.sh bump --install-root "$store" --version "$candidate" --manifest "$manifest" --archive "$archive"

# 설정과 로컬 연결의 일치 여부를 읽는다.
sh harness/sobaya-installed.sh check --install-root "$store"
```

각 명령은 저장소 루트를 기준으로 `dependency` 모드를 사용한다. 개인 설치 저장소는 매번 명시하고 공유 pin에 넣지 않는다. `--cli`는 `sync`에서만 허용하며, 생략하면 지정한 저장소의 `bin/sobaya`를 사용한다. 새 설치기나 실행 코드를 암묵적으로 내려받아 실행하지 않는다.

`check`는 JSON에 `mode`, `version`, `connected`를 반환한다. `connected`는 승인 여부와 다르다. 정상 pin만 있고 아직 feature 연결이 없으면 `false`, 요청한 저장소·현재 worktree의 연결과 훅이 일치하면 `true`다. 존재하는 연결 정보가 요청한 경로와 충돌하면 실패한다. 이 결과를 모든 런타임 파일의 무결성 검증이나 최종 gate 통과로 표현하지 않는다. 실제 소바야 명령은 자체 설치본 검증을 수행한다.

`attach` 전에 정상적인 비 bare 저장소에서 `extensions.worktreeConfig=true`를 준비한다. 최초 연결 전에 준비해야 한다. 이미 다른 scope로 연결된 상태를 자동 이전하지 않는다. 소비자가 저장소 설정과 기존 워크트리를 확인한 후 준비하는 절차를 가이드에 명시한다.

`attach`는 기존의 실제 `AGENTS.md`, `spec.md`, `failed-test.md`가 필요하다. 이를 생성하거나 `Test:`를 덮어쓰거나 승인하지 않는다. main에는 기능 명세가 없을 수 있으므로 `sync`는 설치 복원만 수행한다. 새 clone의 `join`은 개인 저장소를 추측하지 않고 명시적 `sync`와 feature 준비 후 `attach`를 안내한다.

구형 `harness/sobaya.lock`이나 알려진 구형 소바야 pre-commit 훅이 있으면 설치형 연결을 거절한다. 자동 삭제·묵시적 선택·검사 중복 실행을 하지 않는다. 일반 사용자 훅은 기존 협업 훅과 함께 보존·전달한다. 이미 구형 방식으로 쓰는 프로젝트는 계속 구형 명령을 사용할 수 있다. 자동 구형 연결 이전은 후속 작업이다.

실제 워커 실행은 기존 협업 경계를 통과한다.

```sh
sh scripts/collab.sh run -- "$store/bin/sobaya" loop \
  --root "$PWD" --install-root "$store" --app "$PWD" --policy "$reviewed_policy"
```

명세·실패 테스트의 작성과 사람 승인, 승인 브랜치의 merge, 새 브랜치의 worktree 분리, gate·review 후 계획 보관 규칙을 유지한다. 템플릿의 앱 `CLAUDE.md` 심링크는 다시 만들지 않는다.

## 테스트 항목

| 순서 | 이름 | 입증할 동작 |
|---|---|---|
| 1 | `attach_preserves_app` | 실제 공개 버전·해시로 연결하며 기존 파일·인덱스를 보존한다. pin 두 파일만 추가하고 자동 승인하지 않는다. 반복 연결, 승인 없는 연결 상태, 변조된 연결 정보의 읽기 전용 거절을 검증한다. |
| 2 | `attach_rejects_conflicts` | 누락 명세, 구형 lock·관리 훅, 미준비 worktree 설정, 혼합 lock, 잘못된 인자와 저장소 내부 설치 경로를 변경 전에 거절한다. |
| 3 | `sync_restores_exact_pin_without_plans` | 명세 없는 실제 main에서 join이 임의 연결을 만들지 않는다. 명시적 신뢰 CLI로 빈 저장소에 정확한 pin을 복원하고 반복해도 설정·훅을 바꾸지 않는다. |
| 4 | `hooks_join_and_status_preserve_connection` | join·init 반복 후에도 전달 훅과 승인 기록을 유지한다. 정상 커밋은 일반 사용자 훅과 소바야 린트를 한 번씩 실행하고, 협업 또는 사용자 훅의 실패는 뒤 검사를 막는다. |
| 5 | `worktree_does_not_detach_sibling` | 새 worktree 생성·연결이 기존 worktree의 훅과 승인에 영향을 주지 않는다. 새 연결은 새 worktree를 가리키며 승인 상태를 복제하지 않는다. |
| 6 | `bump_validates_and_preserves_state` | 후보 성공·실제 전체 테스트 실패·진행 항목을 구분한다. 성공 시 후보 pin을 남기고 실패 시 복원하며 소스·승인·호출 수·훅·HEAD를 보존한다. |
| 7 | `busy_tracks_live_locks` | 진행 항목과 살아 있는 실행·관리 잠금을 busy로 판단한다. 죽은 shlock 소유자나 해제 후 남은 flock 파일만으로 계속 멈추지 않는다. |
| 8 | `run_keeps_collaboration_boundary` | 로컬 원격의 동료 WIP로 허브 파일 충돌을 재현해 작업자 실행을 막는다. 충돌이 해소되면 작업자 종료 상태를 전달한다. |
| 9 | `published_runtime_completes_fixture_cycle` | 공개 rc.1과 결정적인 작업자 대역으로 협업 래퍼를 통과해 실제 RED→GREEN→전체 테스트→체크포인트→리뷰→gate를 실행한다. 승인 기준·두 번의 호출·리뷰 HEAD와 깨끗한 앱 상태를 확인한다. |

공통 준비는 실제 Git 저장소·로컬 bare 원격과 별도 설치 저장소를 사용한다. Git 외부 프로토콜을 막고 curl·codex를 실패시키며 GitHub 조회는 사용 불가로 대체한다. Node는 실제 앱 테스트 실행용이고 하네스의 새 언어 의존성이 아니다.

아홉째 항목의 `approve`는 이 초안에 포함된 임시 앱과 테스트에만 적용된다. 작업자·리뷰 대역은 실제 모델의 품질·비용·성공률을 측정하지 않는다. 다른 항목의 승인 보존 fixture도 실제 사용자 승인이 아닌 고정된 합성 자료다.

후보 `1.0.0-rc.2-fixture`는 테스트 안에서 공개 payload를 다시 묶은 로컬 자료다. 공개 릴리스가 아니고 GitHub에 게시하지 않는다. 설치·다운로드 자체의 모든 부정 사례는 소바야의 기존 승인된 검사와 중복해 다시 작성하지 않는다.

## 실행과 구현 순서

공개 `v1.0.0-rc.1`의 설치기·매니페스트·아카이브를 받아 릴리스 해시와 확인한 폴더를 `SOBAYA_TEST_ASSETS`로 지정한다. `SOBAYA_TEST_SOURCE`는 공개 커밋을 포함한 별도 소바야 소스 체크아웃이며 후보 패키지 생성에만 사용한다. 초안은 공개 파일의 고정 해시와 패키지 생성 스크립트의 공개 커밋 바이트를 확인한다.

```sh
export SOBAYA_TEST_ASSETS=/absolute/path/to/verified-rc1-assets
export SOBAYA_TEST_SOURCE=/absolute/path/to/sobaya-source
bash collab/active/codex--sobaya-v1-adoption/draft-installed-tests.sh --support-check
bash collab/active/codex--sobaya-v1-adoption/draft-installed-tests.sh --cycle-support
bash collab/active/codex--sobaya-v1-adoption/draft-installed-tests.sh all
```

처음 두 명령은 초안의 준비 코드와 기존 공개 실행기를 확인한다. 새 어댑터의 합격 증거가 아니다. 아직 없는 어댑터는 `NOT PROBED`로 보고하고 의도한 동작의 RED로 세지 않는다. Linux의 flock 분기는 실제 Linux에서 별도로 실행해야 한다.

승인 후 순서대로 테스트를 원문 그대로 적용하고 필요한 소비 코드만 구현한다. 기존 셸 세 스위트와 새 아홉 항목 전체, 협업 규칙 검사, Bash/POSIX 문법 검사를 실행한다. macOS와 Linux에서 검증하고 별도 완료 리뷰 후 PR을 ready로 전환한다. 승인 전에 CI의 필수 성공 기준에 미구현 테스트를 넣지 않는다.

설치형 신규 릴리스의 주간 알림은 후속 범위다. 기존 소스 클론용 알림은 유지하며 이번에는 명시적 후보 지정과 bump PR 흐름을 문서화한다. 자동 구형 연결 이전, 진행 중인 항목의 버전 간 재개, 하네스 파일 재배치는 포함하지 않는다.
