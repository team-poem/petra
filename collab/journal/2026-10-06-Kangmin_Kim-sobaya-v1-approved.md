# 소바야 v1 연결 테스트 승인

## 이벤트
- supersedes collab/journal/2026-10-06-Kangmin_Kim-sobaya-v1-adoption-draft.md 테스트 승인 대기 상태를 종료한다.
- rule 사용자가 검토본에 대해 “승인한다”라고 명시했다. 승인 범위는 설치형 연결의 아홉 셸 테스트이며 실제 소비자 앱 승인은 포함하지 않는다.
- added tests/sobaya-installed.sh 승인된 실행 초안을 바이트 그대로 적용했다.

## 승인 입력
- 원본: `collab/active/codex--sobaya-v1-adoption/draft-installed-tests.sh`
- 적용: `tests/sobaya-installed.sh`
- 두 파일의 SHA-256: `daf61fe2d54c8f82558e6de342053f34ce0a533878c8859663cc0eb24e627871`
- 설명 검토본: `collab/active/codex--sobaya-v1-adoption/review.md`
- 구현 순서·범위: `collab/active/codex--sobaya-v1-adoption/plan.md`
- 원문의 DRAFT 주석도 보존했다. 이 승인 기록이 현재 상태를 명시한다.

## 남은 것
승인 입력과 기존 테스트를 보존하며 항목별 구현, 전체 셸 스위트, macOS·Linux 검증, 독립 완료 리뷰를 진행한다. 템플릿 유지보수에는 기존 셸 절차를 사용하며 가짜 앱 명세나 소바야 승인 상태를 만들지 않는다. PR #5는 검증 전까지 draft다.
