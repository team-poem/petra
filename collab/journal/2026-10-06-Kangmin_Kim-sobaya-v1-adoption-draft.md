# codex/sobaya-v1-adoption · Kangmin_Kim · 2026-10-06
- claim: collab/active/codex--sobaya-v1-adoption/claim.md

## 이벤트
- added collab/active/codex--sobaya-v1-adoption/ 소바야 v1 설치형 연결의 실행 테스트 아홉 항목·전체 설명 검토본·설계·검증 기록 → 중복 연동 구현 전에 이 초안을 검토하고 정확한 입력의 사람 승인을 기다릴 것
- rule harness/sobaya-installed.sh 별도 설치형 진입점을 제안하며 기존 소스 클론 연결을 보존 → 아직 없는 명령을 구현 완료로 안내하지 말 것
- rule harness/sobaya/RULES.md 협업 래퍼·merge·worktree·gate/review 후 계획 보관 기준을 유지 → 이슈 #4의 폴더 재배치·라이브러리화나 템플릿 자체의 셸 TDD 확장을 함께 넣지 말 것

## 남은 것
- 실행 초안 SHA-256 `daf61fe2d54c8f82558e6de342053f34ce0a533878c8859663cc0eb24e627871`에 대한 사람 승인. 현재 구현 코드·기존 테스트·실제 소비 프로젝트 승인 상태는 변경하지 않았다.
- 승인 후 항목별 구현, 기존 세 셸 스위트와 새 테스트 전체 검증, macOS·Linux 확인, 별도 완료 리뷰. 현재 실제 Linux flock 검증은 없다.
- 기존 셸 검사는 hooks 84·loop 48·sobaya 32개 통과했다. 공개 rc.1의 테스트 준비·실제 TDD 사이클은 직접 init을 사용한 준비 검사이며 새 어댑터 성공 증거가 아니다.
- 기존 잠금 감지에서 죽은 shlock 소유자를 busy로 보는 실제 실패를 재현했다. 최종 아홉 대조군은 모두 거절했다. 초안 자체의 fixture 헤더·대조군 허점을 수정한 이력은 validation.md에 남겼다.
- 첫 도입 후에는 소비 프로젝트의 두 root pin을 검증해 bump PR로 올린다. 자동 구형 연결 이전과 설치형 주간 릴리스 알림은 후속 범위다.
