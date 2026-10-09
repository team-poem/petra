# 이전·업데이트·복구

이 명령들은 **검토한 PETRA 제작 리포**에서 실행한다. 설치된 프로젝트가 인터넷의 최신 코드를 자동 실행하지 않는다.
프로젝트는 main이 아닌 작업 브랜치이며 미커밋 변경·실행 중인 워커가 없어야 한다. Git HEAD·인덱스·config와 Sobaya 승인은 변경하지 않는다.

## PETRA 업데이트

```sh
sh bin/petra update --target /absolute/path/to/app --dry-run
sh bin/petra update --target /absolute/path/to/app --apply --expect-plan <plan_id>
```

계획의 생성·교체·삭제 목록을 확인한다. 대상 파일·Git 상태·배포물이 바뀌면 이전 plan은 적용되지 않는다.
업데이트는 manifest가 소유한 실행 코드·스킬·CI 파일과 관리 문서/훅 구역만 바꾼다. `.petra/config.sh`, 팀 기록, 앱 코드/README/Test 명령과 사용자 훅은 보존한다.
관리 파일을 사용자가 고쳤다면 덮어쓰지 않고 중단한다. 그 변경을 프로젝트 설정으로 옮기거나 별도 패치로 관리한 뒤 재시도한다.

적용 후 `sh .petra/bin/petra verify`, 앱 테스트, `check`를 실행하고 새 저널과 PR로 공유한다.
설치형 Sobaya가 연결돼 있으면 전달 훅과 개인 승인 파일을 보존하고 연결 상태를 확인한다. **PETRA 변경이 Sobaya 재승인을 대신하지 않는다.**

## 이전 버전으로 되돌리기

검토한 이전 버전 제작 리포의 코드를 배포물로 지정하고, 0.1.0 이상의 수명주기 실행기를 사용한다.

```sh
node harness/lifecycle-petra.mjs rollback --source /absolute/path/to/older-petra \
  --target /absolute/path/to/app --dry-run
node harness/lifecycle-petra.mjs rollback --source /absolute/path/to/older-petra \
  --target /absolute/path/to/app --apply --expect-plan <plan_id>
```

이전 버전도 schema 1 pack을 제공해야 한다. Git reset이 아니라 관리 파일을 이전 배포물로 바꾸는 새 변경이다.
그 사이 추가된 저널·설정·앱 코드는 지우지 않는다. 실행기를 없앤 구형 템플릿 전체로의 자동 역이전은 아니다.

## 구형 `collab/` 프로젝트 이전

```sh
sh bin/petra migrate --target /absolute/path/to/app \
  --legacy-source /absolute/path/to/original-template --dry-run
sh bin/petra migrate --target /absolute/path/to/app \
  --legacy-source /absolute/path/to/original-template --apply --expect-plan <plan_id>
```

`--legacy-source`는 해당 앱에 사용한, 변경 없는 템플릿 checkout이다. 단순히 가장 최신 checkout을 지정하지 않는다.
기본은 두 에이전트 연결을 함께 이전한다. `--agents codex`를 선택해도 기존 Claude의 구형 하네스 훅이 있으면 중단한다. `--agents both`로 함께 옮기거나 구형 훅을 먼저 검토해 제거해야 삭제된 실행 파일을 참조하지 않는다.
`collab/active`, `collab/journal`은 내용을 바꾸지 않고 `.petra/collab/`로 이동한다. Git 훅과 PR 검사도 이 이동은 허용하지만 저널·동료 claim을 함께 고치면 거절한다.
구형 `harness/config.sh`는 바이트 그대로 `.petra/config.sh`로 옮긴다. **기존 main 예외 목록·HOTSPOTS가 앱에 맞는지는 적용 전에 검토한다.**

알려진 실행 파일만 원본과 바이트·권한이 같은 경우 제거한다. 사용자가 고쳤거나 출처를 모르는 파일, 앱 README·문서·테스트는 남긴다.
`preserved` 목록과 Git diff를 검토해 남은 구형 경로 안내를 정리한다. root AGENTS에는 새 계약을 추가하지만 사용자 문단을 임의로 삭제하지 않는다.
진행 중인 다른 브랜치도 새 main을 받아 별도 검토해야 한다. 새 런타임은 아직 구형 구조인 원격 브랜치의 claim·저널도 읽는다.

설치형 Sobaya 연결은 확인하고 보존한다. `harness/sobaya.lock`을 쓰는 **구형 외부 소스 클론 연결은 자동 이전하지 않는다.** 외부 워크스페이스 어댑터와 앱 연결을 먼저 별도로 검토해야 한다.
사용자 Git 훅을 덮거나 승인 메타데이터를 복사하는 우회는 하지 않는다.

## 강제 종료 뒤 복구

```sh
sh bin/petra recover --target /absolute/path/to/app --dry-run
sh bin/petra recover --target /absolute/path/to/app --apply
```

Git 메타데이터의 `petra-install.lock/backup.json`을 읽어, 이번 작업이 쓴 결과와 현재 파일이 정확히 같은 경우만 되돌린다.
동시 편집이 있으면 멈추고 백업을 남긴다. 잠금만 지우거나 전체 checkout/reset으로 사용자 작업을 버리지 않는다.
일반 오류는 즉시 같은 방식으로 복구한다. 여러 파일 전체가 원자적으로 교체되는 것은 아니다.

`run`을 강제 종료해 `petra-run.lock`이 남았다면 기록된 PID, 실제 워커 종료와 Git 상태를 확인한 뒤 해당 실행 잠금만 정리한다. 설치 복구 잠금과 다른 파일이다.
스냅샷 전송의 `petra/share.lock`도 같은 원칙이다. 죽은 잠금을 동시에 자동 회수하다 새 전송 잠금을 지우지 않도록, 강제 종료 후에는 PID를 확인하고 정리한다.
