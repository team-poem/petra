---
name: start-work
description: 작업 브랜치를 만들고 claim(무엇을 만드는지)을 써서 push 한다. 새 작업을 시작할 때, 훅이 "claim 이 없습니다" 로 막았을 때, 남의 브랜치를 이어받을 때 사용.
---

# start-work — 작업 선언

파일을 고치기 전에 "무엇을 만드는지" 선언하고 push 한다. 훅이 claim 없는 수정을 막으므로 항상 첫 행동이다. 30초면 된다.

## 절차
1. 세션 시작 시 주입된 "동료 작업 중" 과 "지금 같은 파일을 만지는 중" 을 본다. 같은 걸 만들고 있으면 사용자에게 먼저 말한다.
2. 보호 브랜치면 `git fetch origin && git switch -c <type>/<slug> origin/main` (type: feat/fix/chore/docs/refactor).
3. `mkdir -p collab/active/<branch-slug>` (`/`→`--`), `collab/templates/claim.md` 를 `claim.md` 로 복사해 `owner`(= `git config collab.me`)와 `goal` 한 줄을 채운다.
4. claim 만 담은 첫 커밋을 만들고 push 한다. push 해야 동료 세션에 보인다.
   ```
   git add collab/active/<slug> && git commit -m "chore(collab): claim <branch>" && git push -u origin HEAD
   ```

## 공유 파일을 건드리는 작업이라면
goal 이 허브 파일(`harness/config.sh` HOTSPOTS: 스키마, lockfile, 공용 타입 …)을 바꿔야 하면 사용자에게 제안한다:
"스키마·의존성 변경만 담은 작은 `chore/` 브랜치를 먼저 올려 머지하고, 기능 브랜치는 그 위에서". 동료가 그 파일을 기다리는 시간이 사라진다.
동료 claim 의 `next:` 나 "브랜치에 커밋됨" 목록에 내가 만질 파일이 있으면 순서를 사용자와 정한다.

## sobaya로 구현할 브랜치라면
5. root `sobaya.json`·`sobaya.lock`은 설치형, `harness/sobaya.lock`은 구형 소스 클론 방식이다. 혼합하거나 자동 이전하지 않는다. 승인 브랜치가 이미 있으면 2번 대신 `sh scripts/collab.sh worktree <branch>`로 새 worktree를 연다. git-dir별 승인 상태를 복사하거나 다른 브랜치에서 재사용하지 않는다.
6. 설치형은 [정식 연결 절차](../../../docs/sobaya-installed.md)에 따라 신뢰한 런타임과 프로젝트 밖의 개인 저장소를 준비한다. 최초 attach 전에 기존 Git/worktree 설정을 점검하고 worktreeConfig를 준비한다. 사람 소유 `spec.md`와 테스트 초안을 기존 개발 절차로 준비한 뒤 명시적으로 attach한다. attach는 입력 파일을 생성하거나 `Test:`를 바꾸지 않는다. 문서 없는 main에서는 sync만 한다.
   구형 소스 클론은 기존 `bash <sobaya>/tdd-set/bin/install.sh .` 절차로 누락 문서의 골격을 준비한다. 이를 설치형 프로젝트에 호출하지 않는다.
7. 정확한 테스트 입력을 사용자가 승인하면 선택된 런타임의 approve를 실행한다. 연결·sync·bump는 승인이 아니다. 승인된 명세·테스트·도우미·fixture를 에이전트가 바꾸지 않으며 잘못된 테스트는 교체 초안으로 다시 승인받는다.
8. 실제 구현 워커는 항상 `sh scripts/collab.sh run -- <선택된 sobaya 명령>`으로 감싼다. 설치형 loop에는 명시적인 `--root`, `--install-root`, `--app`, 검토한 `--policy`를 전달한다. 동료가 허브 파일을 편집 중이면 시작 전에 멈춘다.

## 이어받기 (남의 브랜치에서 계속할 때)
1. 그 브랜치로 switch. digest 가 "owner 가 @X" 라고 알려준다.
2. 그 브랜치의 최근 저널 `## 남은 것` 을 읽고 사용자에게 요약한다.
3. claim 의 `owner` 를 나로 바꾸고 `## 메모` 에 "YYYY-MM-DD @X → @나 이어받음". 커밋·push.
4. 내 첫 저널 이벤트에 `- reply @X <branch> 이어받았습니다`.

## 하지 않는 것
- claim 전에 코드를 고치지 않는다 (Write/Edit 도 Bash 도 막힌다).
- 다른 브랜치의 claim 을 수정하지 않는다.
