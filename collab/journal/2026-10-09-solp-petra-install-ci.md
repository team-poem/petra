# PETRA 설치 검사 환경 보정

## 이벤트
- changed tests/petra-install.test.mjs macOS CI의 Git background maintenance가 보존 스냅샷 중 lock을 생성·삭제해 실패 → 테스트용 Git 리포에만 maintenance.auto=false와 gc.auto=0을 설정한다. 스냅샷 비교 항목과 제품 설치 동작은 그대로다.

## 남은 것
- 첫 CI에서 Linux 설치 실험실과 협업 검사는 통과했다. macOS 및 전체 기존 회귀는 이 커밋의 CI 결과로 확인한다.
