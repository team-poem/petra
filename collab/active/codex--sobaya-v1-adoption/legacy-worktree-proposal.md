# 구형 worktree 연결 회귀: 테스트 승인 검토

이 문서는 승인 전 제안·RED 검증 이력이다. 사용자는 2026-10-08 아래 정확한 원문과 sync 종료 코드 기준을 승인했다. 현재 승인은 [승인 기록](../../journal/2026-10-08-Kangmin_Kim-sobaya-legacy-approved.md)을 따르며, 아래의 승인 전 표현은 당시 상태를 설명한다.

[PR #5의 솔피 코멘트](https://github.com/team-poem/poem-collaboration-harness-template/pull/5#issuecomment-6033970785)를 실제 공개 소바야 설치기로 재현했다. 새 worktree의 훅 설정은 worktree 범위인데, 구형 어댑터는 공통 설정만 지운다. 설치 실패 뒤에는 없거나 다른 공통 설정을 `.githooks`로 덮어쓰기도 한다.

## 검토할 원문

[전체 코드와 구간별 ┎ 설명](legacy-worktree-review.md)을 읽는다. 코드는 한 덩어리로 연속해서 보이고, 설명은 코드 밖에 있다. [실행 원문](proposed-legacy-worktree-tests.sh)의 정확한 SHA-256은 아래와 같다.

`d736cb05b581bf44f48918599053dffb6039cc8c57743d9255041d362e7d1b12`

234줄, 10,783바이트. 승인 후 원문 그대로 `tests/sobaya-legacy-worktree.sh`에 추가한다. 검토 설명은 실행 파일에 넣지 않는다. 설명을 걷어내는 처리도 필요 없다.

| 입력 | 범위·관계 |
|---|---|
| `proposed-legacy-worktree-tests.sh` | 일곱 사례, 공통 fixture, 관찰 래퍼, Lint·chmod 대역을 모두 포함한 유일한 새 실행 입력 |
| `legacy-worktree-review-notes.json` | 모든 원문 줄을 25개 연속 구간으로 설명하는 표시용 데이터. 실행·승인 상태를 바꾸지 않음 |
| 소바야 `d06384544e81cd373d81e2a940ab336868e04854` | 실제 검증 대상 설치기와 런타임. 임시 clone에서 사용하며 설치기 본문을 변경하지 않음 |
| 이 PR의 `harness/`, `scripts/`, `.githooks/` 등 | fixture로 복사하는 실제 제품 코드. 새 테스트 지원 코드를 별도 파일에 숨기지 않음 |

## 승인 대상 기준

| 사례 | 기대 동작 |
|---|---|
| primary | worktreeConfig가 없는 일반 체크아웃에서 attach·sync·update 성공 |
| absent | 새 worktree의 훅만 설정되고 공통 훅 설정이 없는 상태 유지 |
| equal | 공통·worktree 모두 `.githooks`인 상태 유지 |
| distinct | 부모는 별도 훅, 대상은 `.githooks`인 상태 유지 |
| custom | 공용 위치에 사용자 훅이 있으면 세 명령 모두 거절하고 원문·권한·설정 보존 |
| symlink | 공용 훅이 심링크면 대상 내용과 링크 자체를 보존하며 거절 |
| installer_failure | 실제 설치기가 후보 훅을 쓴 뒤 chmod 단계에서 실패하면 미게시·pin 미생성·설정 보존·임시 경로 정리 |

정상 사례는 매 동작 뒤 실제 협업 pre-commit을 실행해 소바야 Lint가 정확히 한 번 호출되고 성공·실패가 전달되는지도 확인한다. 파일 표식만 있는 비활성 훅은 통과할 수 없다.

**추가로 승인받을 기준:** 기존 base의 `sync`에도 설치 성공 뒤 종료 코드 1을 반환하는 문제가 있다. 이 초안은 정상 attach·sync·update가 모두 0을 반환하도록 요구한다. 해당 종료 코드 수정은 이번 회귀 대응과 함께 진행한다. 이 현상을 PR이 새로 만든 문제로 표현하지 않는다.

## 실행 증거와 한계

- 실행 코드 기준: PR의 `9d8019d`. 초안 실행 당시 HEAD `45d87d9`는 claim만 변경했으며 제품 코드·기존 테스트·CI는 동일했다.
- macOS Bash 3.2에서 최종 해시 원문 실행: **7개 모두 RED**. primary/equal은 실제 설치기 호출 중 공통 설정 변경, 나머지는 종료 뒤 공통 설정 변경을 검출했다. 뒤쪽 단언까지 통과했다는 뜻은 아니다.
- 원래 재현: base `1ebbf5f`에서 실제 attach 0, PR `9d8019d`에서 실제 attach 1. base의 sync는 설치를 마쳐도 1이었다.
- 독립 검토는 최종 해시 원문과 테스트 지원 코드를 확인했다. 별도 임시 저장소에서 실제 설치기 직접 호출과 수동 게시로 훅 성공·실패 전달을 확인했고, chmod 실패 73·후보 생성·상태 보존·경로 정리 단언도 대조 실험했다. **이는 제품 수정이나 전체 GREEN 증거가 아니다.**
- `bash -n` 통과. 검토본의 코드 블록을 추출해 원문과 `cmp` 비교 통과. 표시 도구는 234줄 전체의 순서·해시·범위 연속성도 확인했다.
- 기존 승인된 설치형 입력의 SHA-256은 계속 `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b`이다. 기존 테스트·도우미·제품 코드·CI는 변경하지 않았다.
- 관찰 래퍼 때문에 임시 소바야 clone은 dirty이며 sync/update의 네트워크 pull은 생략된다. 이 테스트는 고정 버전의 로컬 설치 경로를 검증한다. 관찰 직전·직후 사이의 모든 동시 쓰기, 강제 종료, 디스크 장애를 증명하지 않는다.
- Linux와 전체 173개 기존 스위트는 이번 초안 단계에서 다시 실행하지 않았다. 앞선 173개 성공은 이 회귀를 검출하지 못했으며 병합 근거로 충분하지 않다.

로컬 진단 원문은 `/private/tmp/poem-legacy-final-draft-20261008.log`, 상세 fixture는 `/private/var/folders/wv/lv2qb3z92074bwd0pncsq3100000gn/T/poem-legacy-draft.DuQyuS`에 남겼다. 독립 대조 실험은 `/private/tmp/poem-legacy-helper-controls.GvGF6V`와 그 출력 경로를 사용했다. 임시 경로는 장기 보관이나 다른 컴퓨터에서의 접근을 보장하지 않는다.

재현할 때는 d063845 커밋이 있는 로컬 checkout을 `SOBAYA_TEST_SOURCE`로 지정하고 아래 명령을 실행한다.

```sh
SOBAYA_TEST_SOURCE=/path/to/sobaya-source \
SOBAYA_KEEP_DRAFT_EVIDENCE=1 \
bash collab/active/codex--sobaya-v1-adoption/proposed-legacy-worktree-tests.sh all
```

## 승인 후 작업

공유 Git 설정 파일을 쓰지 않는 명령 범위 설정으로 앱 내부 임시 위치에 설치하고, 성공한 관리 훅만 기존 공용 위치에 연결하는 방향을 조사했다. 실제 공용 사용자 훅·심링크 보호는 임시 설치보다 먼저 검사해야 한다. 이 전략은 임시 저장소에서 가능성을 확인했으며 제품 구현은 아직 없다.

정확한 원문 승인을 받은 뒤 테스트를 추가하고 구형 어댑터를 수정한다. 기존 173개와 새 7개, 협업 검사, macOS·Linux CI 및 독립 완료 리뷰를 확인한 뒤 PR의 검증 상태를 갱신한다. 병합·출시는 별도다.

승인 절차의 근거는 소바야 루트 `AGENTS.md`의 사람 소유 입력 계약과 TDD skill의 “Agent-generated tests remain drafts until explicitly approved.”이다. 이미 승인된 테스트에 대한 재승인이 아니라 새 입력과 추가 sync 종료 코드 기준의 승인이다.
