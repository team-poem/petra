# 혼합 연결 차단과 팀 버전 변경 후 sync 안내 — 승인 전 초안

이 문서는 초안·RED 이력이다. 사용자는 2026-10-09 아래 정확한 입력을 승인했다. 현재 승인은 [승인 기록](../../journal/2026-10-09-Kangmin_Kim-sobaya-mixed-mode-approved.md)을 따른다. 아래 승인 전 표현은 당시 상태를 보존한다.

[PR #5의 추가 리뷰](https://github.com/team-poem/poem-collaboration-harness-template/pull/5#issuecomment-6074989301)에 대응한다. 제품 코드는 아직 바꾸지 않았다. 이번 사용자의 진행 요청으로 회귀 초안과 실제 실패 근거를 준비했으며, 아래 정확한 새 입력의 사람 승인은 아직 받지 않았다.

## 검토할 원문

[전체 코드와 코드 밖의 ┎ 설명](mixed-mode-review.md)을 읽는다. 코드 308줄을 한 덩어리로 보여 주고, 모든 줄을 43개 연속 구간으로 설명한다. [실행 원문](proposed-mixed-mode-tests.sh)은 16,054바이트이며 SHA-256은 다음과 같다.

`cafb8d85a57cbb761e886f4f70a4e76d8381a5c245e0adf86236ce9ba0d303ce`

승인 후 원문 그대로 `tests/sobaya-mixed-mode.sh`에 추가한다. 설명은 실행 코드에 넣지 않으므로 제거 과정도 없다. 기존 승인된 180개 테스트는 바꾸지 않는다.

| 입력 | 범위와 의존 관계 |
|---|---|
| `proposed-mixed-mode-tests.sh` | 새 실행 입력 전부. 11개 사례, 앱 Test·Lint, claim·spec·계획·상태 fixture, 공개 자산 검증, 로컬 source·peer·origin, 네트워크/모델 호출 감시기를 한 파일에서 전부 보여 준다. |
| `mixed-mode-review-notes.json` | 원문 전체를 설명하는 표시용 데이터. 승인 상태나 실행 동작을 바꾸지 않는다. |
| 소바야 공개 rc.1 자산 | 고정된 installer·archive SHA-256과 manifest의 버전·commit을 확인한 뒤 실제 설치한다. 설치기 대역을 쓰지 않는다. |
| 소바야 소스 `d06384544e81cd373d81e2a940ab336868e04854` | 구형 실제 설치기를 임시 clone에서 사용한다. 깨끗한 로컬 branch와 한 커밋 앞선 로컬 origin으로 늦은 pull을 관찰한다. |
| `1.0.0-rc.2-fixture` | rc.1 소스를 실제 패키징 스크립트로 다시 묶은 로컬 후보다. 실제 새 버전 출시가 아니다. |
| 이 PR의 제품 파일 | fixture가 현재 `harness/`, `scripts/`, `.githooks/`와 협업 설정을 복사한다. 기존 승인 테스트를 import하거나 숨은 도우미로 실행하지 않는다. |

## 승인 대상 동작

| 사례 | 요구하는 동작 |
|---|---|
| `same/attach`, `same/sync`, `same/update` | 설치형으로 연결된 checkout에서 구형 명령을 거절한다. |
| `installed_primary/attach`, `installed_primary/sync`, `installed_primary/update` | 기본 checkout에 설치형 연결이 있고, pin·자체 연결이 없는 linked checkout에서 구형 명령을 실행해도 거절한다. |
| `installed_linked/attach`, `installed_linked/sync`, `installed_linked/update` | linked checkout에만 설치형 연결이 있고 기본 checkout에서 구형 명령을 실행해도 거절한다. |
| `legacy_state_control` | 설치형 연결·pin 없이 구형 상태 파일만 있는 정상 프로젝트의 attach·sync·update는 계속 성공하고 상태를 보존한다. |
| `pin_sync_guidance` | 동료의 새 팀 pin을 실제 pulse 병합으로 받은 뒤, digest에서 선택 버전과 `sobaya-installed.sh sync --install-root` 안내를 볼 수 있다. check는 연결 검사 의미를 유지한다. |

혼합 연결의 아홉 거절은 다음을 함께 요구한다.

- 실패 진단에 충돌하는 설치형 앱 경로와 ‘설치형’ 사유를 포함한다. 종료 코드의 구체 숫자는 고정하지 않는다.
- 두 checkout의 계약·명세·계획·pin·구형 lock, 합성 상태·연결 metadata, 훅과 공통/worktree 설정, HEAD·인덱스 및 source clone의 HEAD·FETCH_HEAD·설정·어댑터 파일이 보존된다. 새 임시 설치 경로도 남지 않는다.
- 설치형 check가 계속 성공하고, 실제 전달 훅에서 Lint는 한 번 실행된다. claim을 제거하면 협업 규칙이 먼저 차단하며 Lint가 실행되지 않는다.
- attach는 다른 `--test`를 받아도 계약을 고치기 전에 차단한다. sync·update는 clean source의 앞선 origin을 pull하기 전에 차단한다.

안내 사례는 정상 연결의 check가 계속 `connected:true`를 돌려주어도 된다. 이 값은 실행기 설치 준비 완료나 승인을 뜻하지 않는다. digest에 선택 버전과 명시적 sync 절차를 안내하되 자동 설치·자동 승인·새 릴리스 조회는 하지 않는다. 이 초안은 digest의 명령 안내를 요구하며 pulse 출력의 구체 문구나 매번 무거운 런타임 검증을 요구하지 않는다.

## 실제 탐침 결과

제품 기준: `bd0ce9c7faf1437486e99cd4ec406cd321d8c362`. 현재 `4ec5912`는 claim만 갱신한 커밋이라 제품 코드는 같다.

- 환경: macOS arm64, `/bin/bash` 3.2.57, shlock, 로컬 Git origin 및 공개 rc.1 고정 자산.
- 최종 정확한 원문: 위 SHA-256, 308줄. 문법 검사 통과.
- 결과: **11개 중 결함 재현 10개 RED, 구형 호환성 대조군 1개 GREEN**, 전체 종료 코드 1.
- 아홉 혼합 연결 사례: 설치형 정상 check·실제 훅 전제는 통과했다. 구형 명령이 성공해 버리는 지점에서 실패했다.
- 안내 사례: 실제 peer push와 pulse 이후 두 커밋의 조상 관계·깨끗한 작업 트리·동료와 동일한 pin을 확인했다. runtime 부재 상태의 실제 훅 실패, 명시적 로컬 archive sync, 복구 뒤 정상/협업 차단 훅까지 통과했다. 마지막 digest의 sync 안내 부재에서 실패했다.
- 독립 에이전트가 위 정확한 원문을 검토했으며 남은 차단 사항은 없었다. 독립 검토는 원문 검토이고 실행 결과는 주 에이전트의 실제 탐침이다.
- 기존 승인 입력 SHA-256: 설치형 `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b`, 구형 worktree `d736cb05b581bf44f48918599053dffb6039cc8c57743d9255041d362e7d1b12` 그대로다. 제품 코드·기존 테스트·CI는 변경하지 않았다.

최종 로그는 `/private/tmp/poem-mixed-mode-draft-final-red.log`, 보존 증거는 `/private/var/folders/wv/lv2qb3z92074bwd0pncsq3100000gn/T/poem-installed-draft.N3jY44`다. 사례 종료 후 증거 폴더 이름을 바꾸므로 보존된 linked checkout을 그대로 재실행하지 않는다. 재현은 아래 명령으로 새 fixture를 만든다.

```sh
SOBAYA_TEST_SOURCE=/path/to/sobaya-source \
SOBAYA_TEST_ASSETS=/path/to/verified-rc1-assets \
SOBAYA_KEEP_DRAFT_EVIDENCE=1 \
/bin/bash collab/active/codex--sobaya-v1-adoption/proposed-mixed-mode-tests.sh all
```

개별 탐침은 마지막 `all`을 표의 식별자로 바꾼다. Node는 fixture 앱의 언어이며 하네스의 Bash·jq 구현 계약은 유지한다.

## 검증 한계와 다음 단계

이 초안의 스냅샷은 지정된 보호 파일의 남은 내용·경로·실행 가능 여부를 비교한다. 협업 캐시는 제외하며, 잠깐 쓰고 완전히 되돌린 모든 파일 작업까지 감시하지 않는다. 감시기 로그는 PATH의 curl·codex 호출을 확인하고, gh는 선택적 조회를 오프라인 대역으로 처리한다. 실제 원격 GitHub 응답, 모든 네트워크 도구나 전체 Unix 환경의 격리 증거는 아니다.

이전에 탐침 지원을 고치던 중 나온 claim·stage 누락 실패와 중단된 실행은 RED 근거에서 제외했다. 최종 전체 실행만 위 결과에 사용했다. 정상 구형 대조군은 현재도 GREEN인 호환성 보호이며 새 결함으로 세지 않는다.

정확한 입력 승인 후, 혼합 연결 사전 검사 → 승인된 항목 검증 → digest 안내 순서로 구현하고 새 11개와 기존 180개를 함께 검증한다. 최종 제품 수정에는 macOS·Linux 및 독립 완료 리뷰가 필요하다. 이번 문서는 테스트 승인이나 PR 병합 승인이 아니다.
