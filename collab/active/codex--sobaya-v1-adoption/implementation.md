# 승인 후 구현 검증

승인된 원본 SHA-256: `daf61fe2d54c8f82558e6de342053f34ce0a533878c8859663cc0eb24e627871`. 기존 세 테스트 파일도 보존한다.

## 체크포인트 1 — 연결과 읽기 전용 상태

- 시작: 어댑터가 없어 `attach_preserves_app`은 NOT PROBED(exit 2). 제품 RED로 계산하지 않았다.
- 구현 후 원본 `attach_preserves_app` 통과: 공개 버전·pin, 파일·인덱스·상태 보존, 반복 연결, 연결 변조 거절.
- 기존 전체 스위트: hooks 84, loop 48, sobaya 32, 실패 0.
- `attach_rejects_conflicts`는 세 번째 임시 저장소의 훅 디렉터리가 없어 준비 단계에서 중단됐다. 제품 결과가 아니다. `review-v2.md`에 한 줄 보완을 제안했으며 승인 전에는 원본 테스트를 교체하지 않는다.
- 아직 sync·bump·join·worktree·busy 구현과 전체 아홉 항목 검증이 남았다. 전체 완료를 주장하지 않는다.
