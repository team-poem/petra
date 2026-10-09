# 임시 Git 훅 디렉터리 준비 보완 — 승인 요청

기존 승인 원본과 `tests/sobaya-installed.sh`는 그대로 보존했다. `attach_rejects_conflicts`의 세 번째 fixture가 실제 어댑터 호출 전에 `.git/hooks/pre-commit: No such file or directory`로 중단됐다. 외부 Git 설정을 차단하려고 빈 `GIT_TEMPLATE_DIR`을 쓰기 때문에 Git은 `.git/hooks`를 만들지 않는다. 일반 사용자 훅 검증에도 같은 준비가 필요하다.

변경은 공통 fixture의 다음 한 줄 추가뿐이다. 아홉 테스트의 동작·단언·기존 승인 기준은 바뀌지 않는다. 전체 교체 입력은 [proposed-installed-tests-v2.sh](proposed-installed-tests-v2.sh)다.

```bash
  # ┎ 임시 앱을 main 브랜치의 새 Git 저장소로 만든다.
  git -C "$APP" init -q -b main
  # ┎ 빈 Git 템플릿이 만들지 않은 훅 폴더를 준비한다. 뒤의 구형 훅·사용자 훅 검사가 여기에 파일을 쓴다.
  mkdir -p "$APP/.git/hooks"
  # ┎ 테스트 전용 Git 작성자를 설정한다.
  git -C "$APP" config user.name Fixture
```

이 교체본은 사람 승인 전에는 합격 기준으로 적용하지 않는다. 기존 검증은 디렉터리가 없는 준비 실패로 기록하며 제품 동작의 RED나 GREEN으로 세지 않는다.
