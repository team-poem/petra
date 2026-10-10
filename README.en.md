<div align="center">
  <img src="docs/assets/petra-banner.svg" alt="PETRA" width="960">
</div>

# PETRA · 페트라

PETRA is Poem's collaboration tool for Agentic Coding. It helps the team develop in parallel with fewer conflicts by keeping track of each other's progress and coordinating overlapping changes early.
As code is written, each agent shares its goals, files being edited, and important changes.

[한국어](README.md) | **English**

## Sharing and Coordinating Work with Teammates

PETRA is the **Outer Loop** for team collaboration. [Sobaya](https://github.com/team-poem/sobaya) is the **Inner Loop** for writing and verifying code. While each Inner Loop runs, the Outer Loop regularly exchanges work in progress.

<div align="center">
  <img src="docs/assets/petra-flow.svg" alt="PETRA Outer Loop: Sobaya Inner Loops run in parallel while uncommitted changes are shared through Git. PETRA checks file overlaps and journal events, helps coordinate shared changes, and feeds that context back into ongoing development. Verified changes proceed to PR review and merge." width="760">
</div>

- **Share work in progress.** Develop on separate branches and exchange snapshots before committing. Read goals and journals to understand what teammates are working on.
- **Catch potential conflicts early.** PETRA flags simultaneous edits and changes that may affect your code. When concurrent editing is detected on an important shared file, such as a schema, stop editing and coordinate the changes.
- **Identify where coordination is needed.** Agree on scope or order for overlapping changes while independent work continues. Bring verified changes together through small commits and PRs.

Sharing uses the team's Git remote, with no separate server. Agents assess potential conflicts using the information the team has shared and the current state of their own work. PETRA is not a real-time lock that prevents every conflict.

### Sobaya

Sobaya is the default tool for writing code. It is a TDD-based development tool that observes failure against approved tests, then repeats implementation and verification.
See the [Sobaya README](https://github.com/team-poem/sobaya#readme) for the development loop, or the [integration guide](docs/petra-sobaya.md) to connect it to PETRA.

## Getting Started

Requirements: Git, jq, and Node.js 22 or newer. The target project must be a Git repository with an initial commit. Start on a **clean working branch**, not main.

```sh
git clone --depth 1 --branch v0.1.0 https://github.com/team-poem/petra.git
cd petra

# Review the changes before installing.
sh bin/petra install --target /path/to/project --dry-run

# Apply the reviewed plan using the plan_id from the output.
sh bin/petra install --target /path/to/project \
  --apply --expect-plan <plan_id>
```

App code and the project's README stay in place. PETRA's runtime and collaboration records live in `.petra/`.
Review and commit the installation changes, then have each teammate join from their project checkout using their own handle.

```sh
cd /path/to/project
sh .petra/bin/petra join <your-handle>
```

Next, [connect Sobaya](docs/petra-sobaya.md) to start developing. See the [installation guide](docs/petra-install.md) for the full setup.
To try the workflow first, use the [test environment inside this repository](docs/petra-lab.md).

> Work snapshots include uncommitted file contents. Exclude secrets and local-only files with `.gitignore` before sharing.

## Documentation

The detailed guides are currently in Korean.

- [Collaboration guide](docs/guide.md) · Using PETRA during development
- [Sharing during work](docs/petra-sharing.md) · Snapshots, journals, and checkpoints
- [Updates and migration](docs/petra-lifecycle.md) · Version changes, migration, and recovery
- [Architecture and commands](docs/reference.md) · CLI, record formats, and hooks
- [Contributing](CONTRIBUTING.md) · Development and testing
- [AGENTS.md](AGENTS.md) · Rules for agents working in this repository
