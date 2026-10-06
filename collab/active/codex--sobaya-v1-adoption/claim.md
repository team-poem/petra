---
branch: codex/sobaya-v1-adoption
owner: Kangmin_Kim
started: 2026-10-06
status: done
goal: 기존 협업 규칙을 유지하며 소바야 v1 설치형 연결을 지원한다
next: harness/sobaya-installed.sh harness/hooks/lib.sh harness/join.sh scripts/collab.sh tests/ 문서 — 테스트 초안 승인 후
base: main
---

## 메모
- 기존 프로젝트·생성 프로젝트의 소바야 연결을 v1 설치·고정·sync·bump로 확장한다.
- 현재 단계는 실행 가능한 테스트 초안과 설명 검토본 준비다. 정확한 초안 승인 전에는 구현하지 않는다.
- 기존 소스 클론 연결, 승인·워크트리·계획 보관 규칙을 보존한다.
- 템플릿 자체의 셸 테스트를 소바야 TDD에 편입하거나 이슈 #4의 폴더 재배치·라이브러리화를 확정하지 않는다.
- status의 done은 초안 PR 제출을 뜻한다. 기능 구현은 정확한 아홉 테스트 입력의 사람 승인을 기다린다.
