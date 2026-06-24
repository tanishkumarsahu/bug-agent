# 🤖 BugAgent

> **File a bug. Get a PR. Zero human involvement.**

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=flat-square&logo=openai)
![iii Engine](https://img.shields.io/badge/iii-Engine-black?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

BugAgent is a **fully autonomous multi-agent AI system** designed for end-to-end automated bug resolution in codebases. BugAgent embodies the agentic architecture at its core: it takes a GitHub repository URL and a plain-English bug report, then independently analyzes the codebase, identifies the root cause, writes a surgical fix, and opens a Pull Request. No manual triage. No context switching. No human in the loop.

---

## Table of Contents

- [What Did We Intend to Make](#what-did-we-intend-to-make)
- [Why BugAgent](#why-bugagent)
- [Problem Statement](#problem-statement)
- [Demo](#demo)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Agent Pipeline](#agent-pipeline)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Setup](#setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Current Scope](#current-scope-v1)
- [Roadmap](#roadmap-v2)

---

## What Did We Intend to Make

BugAgent is a fully autonomous multi-agent AI system that eliminates the manual bug-to-PR workflow entirely. The intent was to build an agentic pipeline that accepts a plain-English bug report and a GitHub repository URL, then without any human involvement — analyzes the codebase, identifies the root cause, generates a surgical code fix, and opens a ready-to-merge Pull Request. The goal was not to assist developers, but to fully replace the most repetitive, high-cost workflow in software development — end to end, autonomously, in under a minute.

---

## Why BugAgent

Every developer knows the drill — a bug comes in, you context-switch, spend 40 minutes reading unfamiliar code, write a fix, open a PR, and repeat. For small teams, this isn't just annoying — it's a velocity killer.

We built BugAgent because bug resolution is the most repetitive, high-cost, low-creativity task in software development. It follows a pattern every single time. And anything that follows a pattern can be automated.

BugAgent doesn't assist developers. It replaces the entire bug-to-PR workflow — autonomously, end-to-end, in under a minute.

---

## Problem Statement

Software teams lose thousands of engineering hours every month manually triaging bug reports, context-switching into unfamiliar codebases, identifying root causes, writing fixes, and opening pull requests. This is a deeply repetitive, cognitively expensive workflow that drains developer productivity — especially in small teams and early-stage startups where every hour counts.

Existing developer tools require human judgment at every single step of the bug resolution process. There is no solution today that accepts a plain-English bug description and autonomously delivers a reviewed, ready-to-merge GitHub Pull Request with zero human involvement.

**BugAgent closes that gap entirely.** It is the first fully autonomous bug-to-PR pipeline powered by a multi-agent AI architecture, OpenAI, and the iii Engine.

---

## Demo

```
Input:  GitHub repo URL + "Login button not working on iOS Safari"
Output: github.com/user/repo/pull/42  ← real branch, real fix, real PR
```

Autonomous agent pipeline — streams live to UI:

```
BugAnalyzer → CodeSearch → RootCause → FixGenerator → PRCreator
```

Every agent step is visible in real-time. You watch the AI reason through your codebase, identify the problem, and ship the fix — autonomously.

---

## How It Works

BugAgent runs a sequential multi-agent pipeline where each agent has a single responsibility. The `OrchestratorAgent` manages the full lifecycle.

1. **User Input** — Paste a public GitHub repo URL and describe the bug in plain English
2. **BugAnalyzerAgent** — Parses the free-text bug report into a structured context object (affected area, expected vs actual behavior, severity signals)
3. **CodeSearchAgent** — Clones the repository locally and uses semantic search to surface the top 10 most relevant files to the reported bug
4. **RootCauseAgent** — Analyzes the shortlisted files and identifies the exact file, function, and line range responsible for the bug using OpenAI's reasoning capability via the iii Engine
5. **FixGeneratorAgent** — Generates a targeted, minimal code fix for the identified root cause via OpenAI — no unnecessary changes, surgical precision only
6. **PRCreatorAgent** — Creates a new Git branch, commits the fix with a descriptive message, and opens a GitHub Pull Request via Octokit
7. **Live Streaming** — Every step above streams in real-time to the frontend via Server-Sent Events (SSE), giving full visibility into the agent's reasoning

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Next.js Frontend                      │
│          Input Form → Live Agent Feed → PR Result         │
└──────────────────────────┬───────────────────────────────┘
                           │ Server-Sent Events (SSE)
┌──────────────────────────▼───────────────────────────────┐
│               OrchestratorAgent (API Route)               │
│                                                           │
│   BugAnalyzer → CodeSearch → RootCause                   │
│              → FixGenerator → PRCreator                  │
└───────────────────────────────────────────────────────────┘
          │                  │                  │
      OpenAI API         simple-git        GitHub Octokit
    + iii Engine        + Node.js fs        (PR creation)
```

---

## Agent Pipeline

| Agent | Responsibility | Output |
|---|---|---|
| `OrchestratorAgent` | Manages full pipeline lifecycle end-to-end | Session state |
| `BugAnalyzerAgent` | Parses bug report into structured context | Structured bug object |
| `CodeSearchAgent` | Clones repo, surfaces top 10 relevant files | File list with relevance scores |
| `RootCauseAgent` | Identifies exact file + line range causing the bug | Root cause report |
| `FixGeneratorAgent` | Generates targeted surgical code fix via OpenAI | Patched file content |
| `PRCreatorAgent` | Creates branch, commits fix, opens GitHub PR | Pull Request URL |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS | UI, routing, streaming |
| AI / LLM | OpenAI | Reasoning, analysis, fix generation |
| Agentic Layer | Custom multi-agent orchestration | Pipeline management |
| Runtime Engine | iii Engine (Rust-based) | Language-agnostic coordinator for APIs, background jobs, queues, and AI workflows |
| Worker SDK | iii-sdk | Multi-language, multi-worker orchestration via direct engine communication |
| Repo Handling | simple-git, Node.js fs | Clone, read, patch files |
| GitHub Integration | @octokit/rest | Branch, commit, PR creation |
| Real-time | Server-Sent Events (SSE) | Live agent step streaming |

---

## Key Features

- **Fully autonomous pipeline** — submit a bug, receive a PR, zero steps in between
- **Multi-agent architecture** — each agent has a single clear responsibility, clean separation of concerns
- **LLM-powered reasoning** — OpenAI reasons across the full codebase via the iii Engine to find root causes humans would miss
- **Real-time agent visibility** — watch every decision stream live via SSE, full transparency into AI reasoning
- **Surgical code fixes** — minimal diff, targeted single-file changes, no unnecessary modifications
- **Direct GitHub output** — outputs a real, reviewable, merge-ready Pull Request
- **Plain English input** — no structured templates, no special syntax, just describe the bug naturally

---

## Setup

### Prerequisites

- Node.js 18+
- Git installed globally
- OpenAI API key
- GitHub Personal Access Token (fine-grained, scoped to target repo only)

### Install

```bash
git clone https://github.com/tanishkumarsahu/bug-agent
cd bug-agent
npm install
```

### Environment Variables

Create `.env.local` in the root:

```env
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
TEMP_DIR=/tmp/repos
```

> ⚠️ Use a **fine-grained GitHub token** scoped only to your target repository. Never commit this file.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

1. Open the app at `localhost:3000`
2. Paste a **public GitHub repository URL** (JavaScript/TypeScript only)
3. Enter a **bug title** and plain-English **bug description**
4. Click **"Analyze & Fix"**
5. Watch the autonomous multi-agent pipeline execute live
6. Receive a **Pull Request URL** — review and merge when ready

---

## Project Structure

```
bug-agent/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Input form UI
│   │   ├── session/[id]/page.tsx       # Live agent progress UI
│   │   └── api/
│   │       ├── agent/start/route.ts    # POST: start pipeline session
│   │       ├── agent/stream/route.ts   # GET: SSE stream
│   │       └── agent/result/route.ts   # GET: final PR result
│   ├── agents/
│   │   ├── orchestrator.ts             # Pipeline manager
│   │   ├── bug-analyzer.ts             # Bug report parser
│   │   ├── code-search.ts              # Repo clone + file search
│   │   ├── root-cause.ts               # Root cause identifier
│   │   ├── fix-generator.ts            # Code fix generator
│   │   └── pr-creator.ts               # GitHub PR creator
│   ├── tools/
│   │   ├── github.ts                   # Octokit wrapper
│   │   ├── filesystem.ts               # Repo + file operations
│   │   └── openai.ts                   # OpenAI API wrapper
│   ├── types/
│   │   └── index.ts                    # Shared TypeScript types
│   └── store/
│       └── sessions.ts                 # In-memory session store
├── .env.local
├── README.md
├── package.json
└── tailwind.config.ts
```

---

## Current Scope (v1)

- JavaScript and TypeScript repositories only
- Public GitHub repositories only
- Single-file surgical fixes per pipeline run
- Repositories under 50MB
- In-memory session storage (no persistence between server restarts)

---

## Roadmap (v2)

- Multi-file fix support for complex, cross-cutting bugs
- Multi-language support — Python, Go, Rust
- Persistent session storage and full fix history
- Automated test generation alongside the fix
- Slack and Discord bug intake integrations
- Private repository support with scoped auth
- Confidence scoring on root cause identification
- Diff preview in UI before PR is opened

---

## License

MIT © 2026 BugAgent

---

> *Autonomous. Agentic. Zero human involvement.*