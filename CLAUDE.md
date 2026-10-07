# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repository is newly initialized and currently contains only a placeholder `README.md`. There is no source code, build system, test suite, or language-specific tooling yet.

As code is added, this file should be expanded with:
- Build, lint, test, and run commands (including how to run a single test)
- High-level architecture notes that span multiple files

## TypeSafe skill

The TypeSafe plugin (`typesafe@typesafe-ai`, from the `typesafe-ai/skills` marketplace) is enabled at project scope in `.claude/settings.json`. Use the `typesafe-ai` skill (`/typesafe:typesafe-ai`) when working on this project — in particular whenever a feature needs AI judgments (routing, ranking, extraction, verification, scoring) or when an LLM prompt-and-parse step could become a typed decision. Follow the skill's guidance to read the live docs at https://docs.typesafe.ai before writing integration code.

The `v2/` and `v3-clerk/` apps are static Vite builds; any TypeSafe API call must go through a server-side function so the API key never ships to the browser.

## Branch conventions

Development for automated Claude Code sessions happens on branches named `claude/<purpose>-<suffix>` (e.g., `claude/initial-setup-SjVdw`). Push work to the branch specified for the current session; do not push to `main` without explicit instruction.
