# PETRA 설치본 Sobaya 연결과 공개 소개

## 이벤트
- added bin/petra 설치본에 sobaya attach/sync/bump/check 진입점 추가 → 새 .petra 앱은 루트 harness 경로 대신 이 명령 사용
- changed harness/petra-files.mjs join에서 정상 Sobaya 연결·전달 훅을 보존하고 손상된 메타데이터는 거절 → 연결된 프로젝트의 hooksPath를 수동으로 되돌리지 않음
- changed harness/package-petra.sh 소비 패키지에 기존 설치형 어댑터 포함 → 앱 계약·명세·승인을 생성하거나 자동 이전하지 않음
- added tests/petra-sobaya.test.mjs 공개 rc.1과 고정 worker로 실제 소비자 흐름 검증 → SOBAYA_TEST_ASSETS 지정 후 실행, Linux/macOS CI에도 연결
- changed README.md 공개 한국어 소개로 정리하고 영어 README.en.md 추가 → 상세 구조·명령은 docs/reference.md, 새 Sobaya 절차는 docs/petra-sobaya.md 참고

## 검증
- hooks 84, loop 48, sobaya 32, 설치형 9, 구형 worktree 7, 혼합 연결 11 통과. 기존 승인 테스트 파일은 변경 없음.
- PETRA 설치 26, 두 clone 협업 26, 실험실 수명주기 11 통과. 개발용 pack의 기존 worktree join도 유지.
- 새 소비자 통합 8개 시나리오 통과(Node 출력은 상위 테스트 포함 9). attach 입력 보존, join·훅 보존, 손상 거절, worktree 격리, plan 없는 sync, 실제 runtime RED→구현→gate→review, plan 보관 확인.
- shell 문법, git diff --check, Markdown 로컬 링크 검사 통과. 로컬 macOS 실행이며 Linux/macOS PR CI 결과는 PR에서 확인.
- 모델만 고정 대역이다. 실제 모델의 구현·리뷰 품질이나 사용자 앱 테스트 승인을 뜻하지 않는다.

## 남은 것
- 구형 프로젝트 이전, PETRA 자체 업데이트·롤백, 새 소비 구조의 온보딩·스킬·CI 배포는 후속 작업.
- Sobaya upstream은 수정하지 않음. 새 upstream 릴리스 자동 감지·자동 업데이트를 구현한 것은 아님.
