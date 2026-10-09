# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-07
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- supersedes collab/journal/2026-10-06-Kangmin_Kim-sobaya-v1-implementation.md v3 교체 승인 대기를 종료한다. 사용자가 두 fixture 수정안에 대해 “승인한다”라고 명시했다.
- changed tests/sobaya-installed.sh 승인된 v3 원문을 적용했다 → 이후 검증에는 이 입력을 사용한다. 원문의 DRAFT 주석도 바이트 보존하며 현재 승인은 이 기록으로 확인한다.
- changed .github/workflows/harness-check.yml 공개 rc.1과 설치형 아홉 항목을 기존 스위트에 추가했다 → 기존 CI만 통과한 결과를 새 전체 스위트 통과로 읽지 않는다.

## 승인 입력과 범위
- 교체 원본: `collab/active/codex--sobaya-v1-adoption/proposed-installed-tests-v3.sh`
- 적용 파일: `tests/sobaya-installed.sh`
- 양쪽 SHA-256: `f264e7533dc994ca30042fcf062963f6157572a7e51fd3bc446b07a98292e62b`
- 이전 승인 입력: `daf61fe2d54c8f82558e6de342053f34ce0a533878c8859663cc0eb24e627871`
- 변경은 빈 Git 템플릿의 `.git/hooks` 생성과 임시 로컬 main 준비 push의 명시적 훅 우회 두 곳이다. 제품 동작 단언과 실제 협업·커밋 검사는 유지한다.
- 실제 소비자 앱 승인, 모델 호출, 병합, 공개 릴리스는 포함하지 않는다.

## 남은 것
- 최종 커밋의 macOS·Linux 전체 스위트와 협업 검사, 독립 완료 리뷰를 확인한 뒤 PR #5를 Ready for review로 전환한다.
