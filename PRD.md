# BugAgent — Product Requirements Document

## Overview

BugAgent is a fully autonomous, multi-agent system that accepts a bug report and a GitHub repository URL, then — without any human involvement — finds the root cause in the codebase, writes a fix, validates it by running tests in a real Chromium browser via Playwright, and raises a GitHub Pull Request with the fix.

**Tagline:** *"File a bug. Get a PR. No developer needed."*

---

## Problem Statement

When a user reports a bug in a web application:
- A developer has to manually reproduce it
- Dig through logs and code to find the root cause
- Write a fix and test it
- Open a PR

This entire flow takes hours. BugAgent compresses it to minutes, autonomously.

---

## Target Users

- Indie developers and small teams with minimal QA bandwidth
- Open source maintainers drowning in bug reports
- Engineering leaders and dev teams looking to automate bug triage and fixes

---

## Core User Journey

```
User opens BugAgent UI
  → Pastes: GitHub Repo URL + Bug Title + Bug Description
  → Hits "Analyze & Fix"

BugAgent runs autonomously:
  → Clones repo
  → Searches relevant code
  → Identifies root cause
  → Writes fix
  → Runs Playwright tests in Chromium
  → If tests fail → retries (max 3 attempts)
  → If tests pass → raises GitHub PR

User sees: Real-time progress log + PR link at the end
```

---

## Agents & Responsibilities

### 1. OrchestratorAgent
- Entry point for all tasks
- Manages the pipeline: calls each agent in sequence
- Handles retry logic (up to 3 fix attempts if tests fail)
- Tracks state: `{ status, currentAgent, attempts, logs }`
- Emits real-time SSE events to frontend

### 2. BugAnalyzerAgent
- Input: bug title + description
- Uses Claude to extract:
  - Affected feature/component (guess from description)
  - Expected behavior vs actual behavior
  - Keywords to search in codebase
  - Suggested file types to look in (`.tsx`, `.ts`, `.js`, etc.)
- Output: structured `BugContext` object

### 3. CodeSearchAgent
- Clones repo using `simple-git` into `/tmp/repos/{repoId}`
- Reads file tree (respects `.gitignore`)
- Uses keyword + semantic matching to shortlist top 10 relevant files
- Reads those files and passes content to next agent
- Output: `{ relevantFiles: [{path, content}] }`

### 4. RootCauseAgent
- Input: `BugContext` + `relevantFiles`
- Sends all to Claude with a root cause analysis prompt
- Claude identifies: exact file, exact line range, why it's broken
- Output: `{ file, lineRange, explanation, confidence }`

### 5. FixGeneratorAgent
- Input: root cause analysis + original file content
- Claude generates a targeted code fix (not a full rewrite)
- Applies the fix to the cloned repo using fs operations
- Also generates/modifies a Playwright test to validate the fix
- Output: `{ fixedFile, testFile, diffSummary }`

### 6. TestRunnerAgent
- Runs `npx playwright test` on the cloned repo (headless Chromium)
- Captures pass/fail + stderr output
- If fail → passes error back to OrchestratorAgent for retry
- Output: `{ passed: boolean, output: string }`

### 7. PRCreatorAgent
- Input: repo URL, branch name, fix diff, test results
- Creates a new branch: `bugagent/fix-{bugId}`
- Commits the changes
- Uses GitHub Octokit to open a PR with:
  - Title: `[BugAgent] Fix: {bugTitle}`
  - Body: root cause explanation + fix summary + test results
- Output: `{ prUrl }`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (App Router) |
| LLM | Anthropic Claude claude-sonnet-4-20250514 |
| Repo Cloning | simple-git |
| Browser Testing | Playwright (Chromium) |
| GitHub Integration | @octokit/rest |
| Real-time Updates | Server-Sent Events (SSE) |
| Temp Storage | Local filesystem `/tmp/repos/` |
| State Management | In-memory (per request) |

---

## API Endpoints

### `POST /api/agent/start`
```json
Request:
{
  "repoUrl": "https://github.com/user/repo",
  "bugTitle": "Login button not working on mobile",
  "bugDescription": "When I tap the login button on iOS Safari, nothing happens. No error in console."
}

Response:
{
  "sessionId": "abc123",
  "status": "started"
}
```

### `GET /api/agent/stream?sessionId=abc123`
SSE stream emitting:
```json
{ "agent": "BugAnalyzerAgent", "status": "running", "message": "Extracting bug context..." }
{ "agent": "CodeSearchAgent", "status": "running", "message": "Found 8 relevant files" }
{ "agent": "FixGeneratorAgent", "status": "running", "message": "Writing fix for src/components/LoginButton.tsx" }
{ "agent": "TestRunnerAgent", "status": "failed", "message": "Test failed, retrying... (attempt 2/3)" }
{ "agent": "PRCreatorAgent", "status": "done", "prUrl": "https://github.com/user/repo/pull/42" }
```

### `GET /api/agent/result?sessionId=abc123`
```json
{
  "status": "completed",
  "prUrl": "https://github.com/...",
  "rootCause": "...",
  "fixSummary": "...",
  "attempts": 2,
  "testsPassed": true
}
```

---

## UI Screens

### Screen 1: Input Form
- GitHub Repo URL field
- Bug Title field
- Bug Description textarea
- "Analyze & Fix" button
- Recent sessions list (sidebar)

### Screen 2: Live Progress (main demo screen)
- Agent pipeline visualization (7 nodes, highlight active one)
- Real-time log feed (SSE)
- Current attempt counter
- Animated terminal-style output

### Screen 3: Result
- PR URL with "Open PR" button
- Root cause explanation card
- Diff viewer (before/after)
- Test results summary
- "Fix another bug" button

---

## Non-Functional Requirements

- Fix generation within 3 minutes end-to-end
- Max 3 retry attempts per bug
- Repos limited to < 50MB for demo
- Only JavaScript/TypeScript repos supported (v1)
- Chromium runs headless (no display needed)

---

## Out of Scope (v1)

- Multi-file fixes (only single file changed per attempt)
- Private repos (public GitHub only for demo)
- Non-JS/TS projects
- Persistent database (in-memory only)
- Authentication / user accounts

---

## Success Metrics (Demo)

- Bug reported → PR raised in under 3 minutes
- Correct file identified in > 80% of demo cases
- Playwright tests run visibly in Chromium
- Retry loop triggered at least once in live demo (shows intelligence)
- PR body is human-readable and detailed
