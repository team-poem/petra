# 소비 프로젝트의 설정. 제작 리포의 main 예외 목록을 상속하지 않는다.
PROTECTED_BRANCHES="main master develop"
PROTECTED_BRANCH_ALLOW=""
HOTSPOTS="package.json package-lock.json pnpm-lock.yaml yarn.lock prisma/schema.prisma"
SYNC_MODE=merge
AUTO_REBASE=true
PULSE_EVERY_EDITS=15
PULSE_MAX_AGE_SEC=900
WIP_STALE_SEC=7200
JOURNAL_LOOKBACK_DAYS=14
SOBAYA_ROOT=""
