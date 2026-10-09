# PETRA 0.1.0 기능 체크포인트

## 이벤트
- changed scripts/collab.sh share와 checkpoint, 전송 상태, 새 세션 이벤트 재주입을 추가 → Codex도 명시적으로 호출하며 실패를 무충돌로 해석하지 말 것
- added harness/run-petra.mjs 긴 워커 실행 수명에 묶인 공유와 잠금 → 실행 중 HEAD 변경을 끼워 넣지 말 것
- added harness/lifecycle-petra.mjs 관리 파일 업데이트·롤백과 출처 대조형 이전·중단 복구 → 계획 확인 후 적용하며 사용자 변경과 Sobaya 승인을 보존
- added harness/templates/petra/skills/petra/SKILL.md 소비자용 스킬 하나와 온보딩·PR/CI 배선을 추가 → 기존 제작 리포 스킬과 소비자 경로를 구분

## 남은 것
- 최종 Linux/macOS CI, 문서·릴리스 자산 검증과 팀 리뷰. main 병합 전 0.1.0을 정식 배포하지 않는다.
- Claude 모델 호출은 조직 접근 제한으로 미검증. 훅 주입 성공과 구분한다.
