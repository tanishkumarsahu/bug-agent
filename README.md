# 🤖 BugAgent

> **File a bug. Get a PR. Zero human involvement.**

BugAgent is a fully autonomous multi-agent system that takes a GitHub repository URL and a bug report — then independently finds the root cause, writes a fix, validates it in a real Chromium browser using Playwright, and opens a Pull Request.

---

## Demo

```
Input:  GitHub repo URL + "Login button not working on iOS Safari"
Output: github.com/user/repo/pull/42  ← merged, tested, done
```

Real-time agent pipeline runs autonomously:

```
BugAnalyzer → CodeSearch → RootCause → FixGenerator → TestRunner → PRCreator
                                                            ↑
                                              (retries up to 3x if tests fail)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                   │
│         Input Form → Live Progress → Result          │
└─────────────────────┬───────────────────────────────┘
                      │ SSE Stream
┌─────────────────────▼───────────────────────────────┐
│              OrchestratorAgent (API Route)           │
│                                                      │
│  BugAnalyzer → CodeSearch → RootCause               │
│       → FixGenerator → TestRunner ──→ PRCreator     │
│                  ↑___________|  (retry loop)         │
└──────────────────────────────────────────────────────┘
         │              │              │
    Claude API      simple-git     Playwright
    (Anthropic)    + fs ops        (Chromium)
                                       │
                                  GitHub Octokit
                                  (PR creation)
```

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **LLM:** Claude claude-sonnet-4-20250514 (Anthropic)
- **Repo Handling:** simple-git, Node.js fs
- **Browser Testing:** Playwright + Chromium (headless)
- **GitHub:** @octokit/rest
- **Real-time:** Server-Sent Events (SSE)

---

## Setup

### Prerequisites
- Node.js 18+
- Git installed
- Anthropic API key
- GitHub Personal Access Token (repo + PR permissions)

### Install

```bash
git clone https://github.com/tanishkumarsahu/bug-agent
cd bugagent
npm install
npx playwright install chromium
```

### Environment Variables

Create `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
TEMP_DIR=/tmp/repos
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

1. Paste a **public GitHub repo URL**
2. Enter a **bug title** and **description**
3. Click **"Analyze & Fix"**
4. Watch the agent pipeline run in real-time
5. Get a **PR link** when done

---

## Agent Pipeline

| Agent | What it does |
|-------|-------------|
| `BugAnalyzerAgent` | Extracts structured bug context from the description |
| `CodeSearchAgent` | Clones repo, finds top 10 relevant files |
| `RootCauseAgent` | Identifies exact file + line range causing the bug |
| `FixGeneratorAgent` | Writes targeted code fix + Playwright test |
| `TestRunnerAgent` | Runs tests in headless Chromium, returns pass/fail |
| `PRCreatorAgent` | Creates branch, commits, opens GitHub PR |
| `OrchestratorAgent` | Manages full pipeline + retry logic (max 3 attempts) |

---

## Retry Logic

If `TestRunnerAgent` fails:
- Error output is fed back to `FixGeneratorAgent`
- A new fix is attempted with the failure context
- Max 3 attempts before the session is marked as `needs_human_review`

---

## Limitations (v1)

- JavaScript/TypeScript repos only
- Public GitHub repos only
- Single-file fixes per attempt
- Repos < 50MB
- No persistent storage (in-memory sessions)

---

## Project Structure

```
bugagent/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Input form UI
│   │   ├── session/[id]/page.tsx     # Live progress UI
│   │   └── api/
│   │       ├── agent/start/route.ts  # POST: start session
│   │       ├── agent/stream/route.ts # GET: SSE stream
│   │       └── agent/result/route.ts # GET: final result
│   ├── agents/
│   │   ├── orchestrator.ts
│   │   ├── bug-analyzer.ts
│   │   ├── code-search.ts
│   │   ├── root-cause.ts
│   │   ├── fix-generator.ts
│   │   ├── test-runner.ts
│   │   └── pr-creator.ts
│   ├── tools/
│   │   ├── github.ts                 # Octokit wrapper
│   │   ├── filesystem.ts             # Repo clone + file ops
│   │   ├── playwright-runner.ts      # Test execution
│   │   └── claude.ts                 # Anthropic API wrapper
│   ├── types/
│   │   └── index.ts                  # Shared types
│   └── store/
│       └── sessions.ts               # In-memory session store
├── .env.local
├── CLAUDE.md
├── PRD.md
├── README.md
├── package.json
└── tailwind.config.ts
```

---

