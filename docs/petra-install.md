# 기존 프로젝트에 PETRA 처음 붙이기

앱 코드와 README는 프로젝트 루트에 그대로 남는다. PETRA는 `.petra/` 안에 놓고,
루트 AGENTS와 선택한 에이전트 설정에 작은 연결만 추가한다. 이 문서는 **PETRA가 아직 없는 앱에 최초 설치**하는 절차다.
기존 템플릿 정리, 구형 기록 이전, 업데이트/롤백과 Sobaya 재연결은 아직 지원하지 않는다.

## 설치 흐름

Git, jq, Node.js 22 이상이 필요하다. 별도 npm 설치나 서버, 모델 API 호출은 없다.
검토한 PETRA 제작 리포에서 아래 명령을 실행한다. 대상 앱은 초기 커밋이 있는 Git 리포여야 하며,
main이 아닌 설치 전용 브랜치에서 시작한다. 작업 트리와 인덱스가 깨끗해야 한다.

```sh
sh bin/petra install --target /absolute/path/to/shop --dry-run
```

출력은 JSON이다. `changes`에 생성/연결할 파일, `preserved`에 보존하는 영역,
`plan_id`에 확인한 계획의 식별자가 나온다. dry-run은 대상 앱 파일, Git 설정, 인덱스, 캐시를 바꾸지 않는다.

계획을 확인한 다음 같은 대상과 옵션으로 실행한다.

```sh
sh bin/petra install --target /absolute/path/to/shop --apply --expect-plan <출력된-plan_id>
```

앱이나 Git 설정, 설치 배포물이 달라졌으면 쓰기 전에 멈춘다. 새 dry-run으로 변경 내용을 다시 확인한다.
설치는 자동 커밋·push·합류·GitHub 정책 변경을 하지 않는다. 적용된 diff를 검토하고 커밋한 다음,
앱에서 `sh .petra/bin/petra join solp`를 실행한다. 동료는 설치 PR을 받은 뒤 자기 clone에서 `join amazon`을 실행한다.

설치된 앱에서 `sh .petra/bin/petra verify`로 파일과 연결을 검사할 수 있다.
같은 배포물과 옵션으로 설치를 반복하면 파일·권한·mtime과 설정을 다시 쓰지 않는다.

## 무엇이 보존되나

| 대상 | 동작 |
|---|---|
| 앱 소스·README·테스트·package.json | 읽어 치환하거나 이동하지 않음 |
| AGENTS.md | 기존 바이트와 실제 Test 명령 뒤에 PETRA 참조 구역 추가 |
| Claude settings.json | 기존 키와 훅 순서를 유지한 채 PETRA 항목 추가. JSON 들여쓰기는 정규화 |
| Codex 설정 | 수정하지 않음. 공통 AGENTS와 CLI로 연결 |
| `.petra/config.sh`, claim·저널 | 최초 골격만 제공. 재설치 때 사용자 변경을 덮지 않음 |
| Git 설정·HEAD·인덱스·원격 | install은 변경하지 않음. join에서 해당 clone/worktree의 핸들과 훅 활성화 |
| 기존 CI·PR 양식·보호 규칙 | 변경하지 않음. 소비자 CI 자동 설치는 후속 범위 |

기본 `--agents both`는 AGENTS 연결과 Claude 훅을 준비한다. `--agents codex`는 AGENTS만,
`--agents claude`도 공통 AGENTS를 유지하면서 Claude 훅을 준비한다. dry-run/apply에 같은 옵션을 사용한다.
이름만 같은 Codex hooks.json을 만들어 자동 훅이 지원된다고 가정하지 않는다.
Claude의 실제 모델 접근과 도구 버전별 동작도 설치 성공과 별도로 확인한다.

## 멈추는 경우

- 기존 `.githooks`의 같은 이름 파일, 실행 가능한 기본 Git 훅, 다른 `core.hooksPath`가 있음. 사용자 훅을 건너뛰거나 덮어쓰지 않는다.
- 파일 또는 부모가 심링크임, 알 수 없는 `.petra`가 있음, Claude JSON이 깨졌거나 전체 훅이 비활성화됨.
- 설치 파일이 `.gitignore` 등에 가려져 commit/clone으로 동료에게 전달되지 않음. 설치기가 ignore 규칙을 몰래 수정하지 않는다.
- main, 미커밋 변경, merge/rebase, 다른 설치가 진행 중임.
- `collab/`, 구형 하네스 설정, Sobaya pin이나 현재/형제 worktree의 Sobaya 상태가 있음. 이번 설치로 자동 이전하지 않는다.
- 설치 후 관리 파일, PETRA 문서 구역이나 훅 항목이 바뀜. 사용자 영역의 정상 수정은 허용하되 PETRA 구역은 덮지 않는다.

linked worktree는 `extensions.worktreeConfig=true`가 준비돼 있어야 한다. 설치기는 공통 설정을 켜거나 다른 worktree를 수정하지 않는다.

## 실패와 중단

각 파일을 쓰기 전 기존 바이트·권한을 Git 메타데이터의 `petra-install.lock/backup.json`에 기록한다.
일반 실패는 이번 설치가 실제로 쓴 파일만 복구한다. 복구 시 다른 사람이 수정한 파일이 발견되면
그 파일을 덮지 않고 백업과 진단을 남긴다. 다중 파일 변경 전체가 원자적이라는 뜻은 아니다.

강제 종료나 동시 편집으로 백업이 남으면 verify/join과 다음 설치가 멈춘다.
에이전트는 백업의 `target`, `files`의 before/after, `written`과 실제 파일을 비교해 복구안을 먼저 설명해야 한다.
`before.bytes`는 원본의 base64이며 `mode`는 원래 권한이다. 현재 내용이 after와 다르면 사용자의 추가 변경부터 보존한다.
복구와 상태 확인 전에는 잠금만 삭제하거나 전체 reset/삭제를 하지 않는다. 자동 복구 명령은 이번 범위가 아니다.

## 이 리포에서 검증

```sh
node --test tests/petra-install.test.mjs
sh scripts/petra-lab.sh test
```

내부 실험실의 `up/reset`도 이제 쇼핑몰에 실제 dry-run/apply를 거친 뒤 solp·amazon clone을 만든다.
기존 수동 환경은 `up`으로 보존되며 최신 설치기로 바꾸려면 세션을 닫고 `reset`한다.
CI는 Linux/macOS에서 설치 보존·실패 주입·강제 종료와 기존 협업 시나리오를 검사하고 `install.log`를 보관한다.
모델 호출을 흉내 낸 성공이나 이 테스트 통과를 Sobaya 신규 연결 완료로 표시하지 않는다.
