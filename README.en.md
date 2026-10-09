# PETRA

**Poem's Engineering, Testing & Review Assistant**

A collaboration harness for developers working **in the same project, each with their own AI agent**.

[한국어](README.md) | **English**

## Why PETRA?

Agents working in the same project do not automatically know each other's progress or intent.
Without that shared context, teams face duplicate implementations, conflicts, and incomplete handoffs.

PETRA shares **who is building what, which files are being edited, and what other agents need to know** through Git.
It supports parallel development through shared work status and change context rather than fixed directory ownership.

## What It Provides

| Need | PETRA's role |
|---|---|
| Know what others are doing | Collect goals, relevant changes, questions, and edited files for the agent |
| Work concurrently | Detect file overlap and coordinate important shared files without reserving whole directories |
| Preserve context | Record changes and remaining work in new journal files for later sessions |
| Use different agents | Share an AGENTS contract and CLI; use Claude hooks where available and explicit CLI calls otherwise |
| Connect a development loop | Optionally integrate Sobaya to implement and verify approved tests |

No separate collaboration server or database is required. Information travels through your team's Git remote.
PETRA's collaboration commands do not call a model API. Your agents and Sobaya workers have their own authentication and costs.

## How It Works

```text
Share a goal → Read team context → Develop and share changes → Journal and checks → PR
```

At the start, an agent reads teammates' goals and relevant changes.
During work, Git snapshots reveal overlapping edits before a normal commit. Agents commit verified changes as checkpoints and publish journal events when shared contracts change, not only at handoff.
Hooks and a shared CLI connect this workflow, while Git hooks enforce collaboration rules at commit and push time.
Long-running workers keep sharing snapshots; failed delivery and stale observations are reported explicitly.

Only published and fetched information is visible. PETRA is not a real-time lock or a guarantee of conflict-free merges.

## Getting Started

Requirements: Git, jq, and Node.js 22 or newer. Follow the [installation guide](docs/petra-install.md) to review and apply a plan, then have each teammate run `join`.
App code, README, and tests remain in place. PETRA runtime files and team records live under `.petra/`.
To try it first, use the [internal lab](docs/petra-lab.md).

## Working with Sobaya

**PETRA coordinates work with other people's agents. Sobaya implements and verifies approved specifications and tests.**
PETRA connects to a runtime installed outside the project; it does not modify Sobaya's source.

The team pins its version in `sobaya.json` and `sobaya.lock`. A reviewed version change goes through a PR; teammates then run `sync`.
A new upstream release does not silently replace the runtime in a running project.
See [PETRA + Sobaya](docs/petra-sobaya.md).

## Documentation

The detailed guides below are currently in Korean; both project introductions cover the same scope.

| Topic | Document |
|---|---|
| A day of collaboration, with examples | [Human guide](docs/guide.md) |
| Installation, joining, and preserving settings | [Installation](docs/petra-install.md) |
| Uncommitted sharing and checkpoints | [Sharing during work](docs/petra-sharing.md) |
| Migration, updates, rollback, and recovery | [Lifecycle](docs/petra-lifecycle.md) |
| Sobaya connection, development, and version sync | [PETRA + Sobaya](docs/petra-sobaya.md) |
| Repeatable tests inside this repository | [Internal lab](docs/petra-lab.md) |
| Commands, data formats, and hook behavior | [Architecture and protocol reference](docs/reference.md) |
| Agent contract for maintaining this repository | [AGENTS.md](AGENTS.md) |

## Current Status

PETRA is **preparing its 0.1.0 release**. The `.petra` layout, collaboration loop, and installed Sobaya integration now include migration, updates, recovery, onboarding, and consumer PR/CI integration.
Linux/macOS CI verifies temporary consumer projects. This does not establish real-model judgment quality or prevention of every conflict.

See the [0.1.0 verification record](docs/petra-010-testing.md) for tested behavior and remaining tool-specific limitations.
Read [CONTRIBUTING.md](CONTRIBUTING.md) before modifying this repository.
