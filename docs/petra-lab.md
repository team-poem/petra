# 이 저장소 안에서 PETRA 테스트하기

머지 전부터 테스트할 수 있다. 테스트 원본, 실행 명령, 자동 검사를 이 저장소에서 함께 관리한다.
다른 GitHub 프로젝트나 항상 비워두는 테스트 전용 브랜치를 만들 필요가 없다.
solp와 amazon의 동시 작업을 재현하려고 안쪽에 두 개의 독립된 Git clone을 만들지만, 둘 다 이 리포의 `.petra-lab/` 아래에 있다.

## 처음 한 번 준비

Git, jq, Node.js 22 이상이 있는 환경에서 실행한다. 앱 테스트에 외부 패키지 설치나 모델 API 키는 필요 없다.

```sh
sh scripts/petra-lab.sh up
```

준비가 끝나면 아래 두 폴더를 각각 에이전트로 연다. 실행 명령이 전체 경로를 출력한다.

```text
.petra-lab/dev/current/solp
.petra-lab/dev/current/amazon
```

쇼핑몰 원본에 실제 PETRA 설치기의 dry-run/apply를 거친 뒤 두 clone을 만든다.
각 폴더에는 작은 쇼핑몰, 현재 PETRA 코드, 해당 핸들과 Git 훅이 준비된다. 설치 절차는 [최초 설치 안내](petra-install.md)를 따른다.
둘의 origin은 `.petra-lab/dev/current/origin.git`이다. 실험 중의 commit/push는 이 로컬 원격으로 가며 GitHub에는 올라가지 않는다.

solp 쪽에는 "상품 가격 표시 기능을 시작해줘", amazon 쪽에는 "장바구니 합계를 시작해줘"라고 요청한다.
에이전트가 앱 AGENTS와 PETRA 계약을 읽고, 브랜치와 claim을 만들며 시작하는지 확인한다.
한쪽에서 가격 함수 사용법을 바꾸고 저널에 남겼을 때, 상대가 digest를 읽고 호출부를 확인하는지가 핵심이다.
자동 훅이 없는 도구는 `sh .petra/bin/petra digest --fetch`와 `pulse`를 직접 실행한다.

## 다시 사용할 때

| 명령 | 동작 |
|---|---|
| `sh scripts/petra-lab.sh up` | 없으면 준비하고, 있으면 현재 작업을 그대로 사용 |
| `sh scripts/petra-lab.sh status` | 두 작업 폴더, 준비한 소스 커밋, 최근 자동 검사 결과 표시 |
| `sh scripts/petra-lab.sh reset` | 현재 소스로 새 환경 준비. 이전 폴더와 수동 변경은 runs/에 보존 |
| `sh scripts/petra-lab.sh test` | 별도 실행 공간에서 자동 협업 검사. 수동 작업 공간은 그대로 유지 |

PETRA 코드를 고친 뒤 자동 검사는 `test`, 새로운 수동 테스트는 세션을 닫고 `reset`으로 준비한다.
각 실행의 `install.log`, `test.log`, `result.json`, 실제 clone은 `.petra-lab/dev/runs/`에 남는다.
오래된 실행 폴더는 필요 없어졌을 때 삭제할 수 있고, 명령은 자동으로 과거 수동 작업을 지우지 않는다.
여러 환경이 필요하면 `sh scripts/petra-lab.sh --name experiment up`처럼 이름을 지정한다.

## PR마다 자동으로 확인

GitHub Actions의 `harness-check`가 PR마다 아래를 실행한다. main에 머지하기 전에 결과를 볼 수 있다.

1. Linux와 macOS에서 이 리포의 쇼핑몰 원본과 현재 PETRA 코드로 실험실을 준비한다.
2. 환경 재사용, 초기화 시 작업 보존, 두 clone의 Git 훅과 테스트 명령을 확인한다.
   설치기 검사는 기존 앱·설정 보존, 계획 변경 거절, 재설치, 실패 복구·강제 종료도 확인한다.
3. 작업 선언, 저널 질문·답변, 함수 변경 전달, 허브 파일 차단, PR 검사, 구형 기록 호환을 자동으로 재현한다.
4. 결과와 진단 로그를 `petra-lab-ubuntu-latest`, `petra-lab-macos-latest` 아티팩트로 7일 보관한다.

CI는 항상 깨끗한 실행 공간에서 검사한다. 사람이 매번 프로젝트를 다시 만드는 것이 아니라 같은 원본과 명령이 자동으로 준비한다.
워크플로가 기본 브랜치에 반영된 뒤에는 GitHub Actions의 Run workflow로도 원하는 브랜치를 검사할 수 있다.
로컬에서도 같은 전체 검사를 `sh tests/petra-lab.sh`로 실행할 수 있다.

## 무엇을 검증한 것인가

자동 검사는 실제 Git과 PETRA CLI·훅이 올바르게 동작하는지를 확인한다. 실제 모델이 내용을 이해하고 구현하는지까지 대신 확인하지는 않는다.
실제 Codex·Claude 세션은 위 두 폴더에서 진행하며 각 계정의 접근 권한이 필요하다. 기존 실행 결과와 제한은 [첫 배치 기록](petra-first-slice-testing.md)에 있다.

이 실험실은 PETRA 개발용이다. 소비 프로젝트에 설치되는 훅·스킬 수는 늘어나지 않는다.
최초 설치는 이 환경에서 검사한다. 이전·업데이트 시나리오는 후속으로 추가한다.

## 설치형 Sobaya 통합 검사

새 설치본과 Sobaya 공개 런타임의 연결은 별도 통합 검사로 실행한다:

```sh
SOBAYA_TEST_ASSETS=/absolute/path/to/verified-rc1-assets \
  node --test tests/petra-sobaya.test.mjs
```

리포 안의 테스트 코드가 임시 앱·원격·clone·worktree를 만들고 정리한다. 별도 GitHub 프로젝트는 필요 없다.
`PETRA_KEEP_TEST_EVIDENCE=1`이면 출력된 임시 경로를 보존해 실패 원인을 확인할 수 있다.
Linux/macOS의 PETRA CI도 같은 검사를 실행한다. 공개 자산 준비와 검증 범위는 [PETRA + Sobaya](petra-sobaya.md)를 따른다.
기본 `petra-lab.sh test`는 공개 Sobaya 자산 없이도 실행되며 이 통합 검사를 포함하지 않는다.

## 관리 위치

```text
tests/fixtures/shop/       버전 관리되는 작은 쇼핑몰 원본
tests/support/            로컬·CI 공통 Git 환경 준비
tests/petra.sh            두 clone 협업 시나리오 26개
tests/petra-install.test.mjs 최초 설치·보존·실패 처리
tests/petra-sobaya.test.mjs 설치된 PETRA와 공개 Sobaya 연결·개발 루프
tests/petra-lab.sh        재사용·초기화·자동 검사 보존 11개 + 협업 시나리오
scripts/petra-lab.sh      up / status / reset / test
.petra-lab/               생성한 실제 작업 공간과 결과 (커밋 제외)
.github/workflows/        PR의 Linux/macOS 검사와 결과 업로드
```

원본과 검사는 일반 개발 브랜치에서 함께 변경한다. 테스트만 위한 장기 브랜치로 분리하면
PETRA 변경과 테스트 원본이 어긋날 수 있으므로, 매 PR이 자기 코드로 환경을 준비하게 했다.
