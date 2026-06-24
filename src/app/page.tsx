'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface TerminalLine {
  text: string
  color: string
}

const TERMINAL_LINES: TerminalLine[] = [
  { text: "[17:15:01] ", color: "text-white/40" },
  { text: "BugAnalyzer → ", color: "text-indigo-400" },
  { text: "parsing bug description with OpenAI...\n", color: "text-white" },
  { text: "[17:15:02] ", color: "text-white/40" },
  { text: "CodeSearch   → ", color: "text-indigo-400" },
  { text: "cloning repository via simple-git...\n", color: "text-white" },
  { text: "[17:15:04] ", color: "text-white/40" },
  { text: "CodeSearch   → ", color: "text-indigo-400" },
  { text: "cloned 24MB, scanning codebase...\n", color: "text-white" },
  { text: "[17:15:05] ", color: "text-white/40" },
  { text: "CodeSearch   → ", color: "text-indigo-400" },
  { text: "found 10 candidate files\n", color: "text-white" },
  { text: "[17:15:07] ", color: "text-white/40" },
  { text: "RootCause    → ", color: "text-indigo-400" },
  { text: "analyzing candidates via iii Engine...\n", color: "text-white" },
  { text: "[17:15:09] ", color: "text-white/40" },
  { text: "RootCause    → ", color: "text-indigo-400" },
  { text: "target identified: src/store/auth.ts:42-56\n", color: "text-white" },
  { text: "[17:15:11] ", color: "text-white/40" },
  { text: "FixGenerator → ", color: "text-indigo-400" },
  { text: "drafting surgical code patch with OpenAI...\n", color: "text-white" },
  { text: "[17:15:13] ", color: "text-white/40" },
  { text: "PRCreator    → ", color: "text-indigo-400" },
  { text: "creating git branch and committing fix...\n", color: "text-white" },
  { text: "[17:15:15] ", color: "text-white/40" },
  { text: "PRCreator    → ", color: "text-indigo-400" },
  { text: "opening GitHub Pull Request #42...\n", color: "text-white" },
  { text: "────────────────────────────────────────────────\n", color: "text-white/20" },
  { text: "github.com/user/repo/pull/42 ", color: "text-white" },
  { text: "← PR raised! ☕", color: "text-indigo-400" }
]

export default function Home() {
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState('')
  const [bugTitle, setBugTitle] = useState('')
  const [bugDescription, setBugDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Terminal simulated logs state
  const [displayedLogs, setDisplayedLogs] = useState<{ text: string; color: string }[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    let lineIdx = 0
    let charIdx = 0
    let tempLogs: { text: string; color: string }[] = []

    function typeChar() {
      if (!active) return
      if (lineIdx >= TERMINAL_LINES.length) {
        // Loop back after 8 seconds
        setTimeout(() => {
          if (active) {
            setDisplayedLogs([])
            lineIdx = 0
            charIdx = 0
            tempLogs = []
            typeChar()
          }
        }, 8000)
        return
      }

      const lineData = TERMINAL_LINES[lineIdx]
      if (charIdx === 0) {
        tempLogs.push({ text: '', color: lineData.color })
      }

      const currentText = lineData.text
      const textToAppend = currentText.charAt(charIdx)
      
      // Update last index
      tempLogs[tempLogs.length - 1].text += textToAppend
      setDisplayedLogs([...tempLogs])

      charIdx++
      if (charIdx >= currentText.length) {
        charIdx = 0
        lineIdx++
        const delay = currentText.includes('\n') ? 350 : 50
        setTimeout(typeChar, delay)
      } else {
        setTimeout(typeChar, 12)
      }
    }

    // Start simulation after 800ms
    const startTimeout = setTimeout(typeChar, 800)

    return () => {
      active = false
      clearTimeout(startTimeout)
    }
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [displayedLogs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, bugTitle, bugDescription }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start session')
      }
      const { sessionId } = await res.json()
      router.push(`/session/${sessionId}`)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="bg-background text-on-surface">
      
      {/* 1. Hero / Main Section */}
      <section className="min-h-[85vh] flex items-center pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          
          {/* Hero Left Side: Brand Value Proposition */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-primary font-semibold">
              Autonomous Bug Resolution
            </div>
            <h1 className="font-mono text-4xl md:text-7xl leading-[1.05] font-bold text-on-surface mb-6 tracking-tighter">
              Your bug.<br />
              Our PR.<br />
              <span className="text-primary-container">Your coffee.</span>
            </h1>
            <p className="text-base md:text-lg text-on-surface-variant mb-10 max-w-xl leading-relaxed">
              BugAgent clones your repo, analyzes the issue, identifies the broken code line, designs the fix using OpenAI and the iii Engine, and opens the pull request automatically. You do nothing after submitting.
            </p>
            <div className="flex flex-wrap gap-4 items-center mb-8">
              <a 
                href="#get-started" 
                className="bg-primary-container text-white px-8 py-4 font-mono text-sm font-semibold uppercase tracking-wider hover:brightness-110 transition-all"
              >
                Try It Now
              </a>
              <a 
                href="#how-it-works" 
                className="px-6 py-4 font-mono text-sm font-semibold text-primary hover:bg-surface-container-low transition-colors"
              >
                How It Works →
              </a>
            </div>
            <div className="text-xs text-on-surface-variant/70 italic border-l-2 border-outline-variant pl-4">
              Works on public JS/TS repositories. Powered by OpenAI, the Rust-based iii Engine, and simple-git.
            </div>
          </div>

          {/* Hero Right Side: Interactive Typewriter Terminal */}
          <div className="lg:col-span-5 w-full flex items-center justify-center">
            <div className="w-full max-w-[500px] h-[450px] bg-[#0A0A0A] rounded shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
              
              {/* Window Header */}
              <div className="bg-[#141414] h-10 flex items-center px-4 gap-1.5 border-b border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></div>
                <div className="flex-1 text-center font-mono text-[9px] uppercase tracking-widest text-white/40">
                  bugagent — terminal simulation
                </div>
              </div>

              {/* Console Output */}
              <div 
                ref={terminalRef} 
                className="p-5 font-mono text-xs text-white/95 space-y-1 overflow-y-auto flex-1 custom-scrollbar leading-relaxed"
              >
                {displayedLogs.map((log, i) => (
                  <span key={i} className={`${log.color} whitespace-pre-wrap`}>
                    {log.text}
                  </span>
                ))}
                <span className="terminal-cursor" />
              </div>
            </div>
          </div>

        </div>
      </section>



      {/* 3. Get Started Form Container */}
      <section id="get-started" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2">
              Launch Agent Pipeline
            </div>
            <h2 className="font-mono text-3xl md:text-4xl font-semibold text-on-surface mb-3">
              Submit your bug details
            </h2>
            <p className="text-sm text-on-surface-variant max-w-lg mx-auto">
              Provide the GitHub URL and describe the problem. BugAgent will spawn the multi-agent cluster and begin working.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="border border-outline-variant p-8 md:p-10 space-y-6">
            
            {/* Input field 1: Github URL */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] uppercase tracking-wider font-semibold text-on-surface">
                GitHub Repo URL
              </label>
              <input
                type="url"
                required
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full bg-white border border-outline-variant px-4 py-3 text-sm placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded transition-all font-mono"
              />
              <p className="text-[11px] text-on-surface-variant/60 font-mono">
                Must be a public JavaScript, TypeScript, or Node.js project.
              </p>
            </div>

            {/* Input field 2: Bug Title */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] uppercase tracking-wider font-semibold text-on-surface">
                Bug Title
              </label>
              <input
                type="text"
                required
                value={bugTitle}
                onChange={e => setBugTitle(e.target.value)}
                placeholder="e.g., Login button not responding on iOS Safari"
                className="w-full bg-white border border-outline-variant px-4 py-3 text-sm placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded transition-all"
              />
            </div>

            {/* Input field 3: Bug Description */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] uppercase tracking-wider font-semibold text-on-surface">
                Bug Description & Context
              </label>
              <textarea
                required
                rows={5}
                value={bugDescription}
                onChange={e => setBugDescription(e.target.value)}
                placeholder="Provide details about what you expected vs what actually happened. Include stack traces, error messages, or component names if available..."
                className="w-full bg-white border border-outline-variant px-4 py-3 text-sm placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded transition-all resize-none"
              />
            </div>

            {error && (
              <div className="text-xs text-error bg-red-50 border border-error/20 p-4 font-mono">
                [ERROR]: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-white py-4 font-mono text-xs font-semibold uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Spinning Up Agent Pipeline...
                </>
              ) : (
                'Analyze & Fix Bug →'
              )}
            </button>

          </form>
        </div>
      </section>

      {/* 4. Bento-style "How it Works" Orchestrator breakdown */}
      <section id="how-it-works" className="py-24 bg-surface-container-low border-t border-outline-variant">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          
          <div className="mb-16 max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2">
              The Architecture
            </div>
            <h2 className="font-mono text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Autonomous from ticket to merged Pull Request.
            </h2>
            <p className="text-on-surface-variant text-sm max-w-xl">
              We do not just hallucinate suggestions. BugAgent deploys a self-correcting agent loop coordinated via Rust's iii Engine. Here is the internal pipeline:
            </p>
          </div>

          {/* Agent cluster Bento-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Box 1: Orchestrator */}
            <div className="md:col-span-8 bg-white border border-outline-variant p-8 flex flex-col justify-between group hover:border-primary-container transition-all duration-300">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-mono text-xl font-bold text-on-surface">01. OrchestratorAgent</h3>
                  <span className="material-symbols-outlined text-primary text-3xl">leaderboard</span>
                </div>
                <p className="text-sm font-semibold text-primary mb-3">
                  System Core & State Coordinator
                </p>
                <p className="text-xs text-on-surface-variant leading-relaxed max-w-2xl">
                  Manages the execution pipeline sequentially. If any agent encounters code blocks requiring analysis or patches, the Orchestrator initiates direct communicate loops feeding structural context data back and forth. Handles thread state logs.
                </p>
              </div>
              <div className="mt-8 bg-surface-container-low p-3.5 rounded border border-outline-variant/40">
                <code className="font-mono text-[11px] text-primary">Orchestrator: iii-engine="Rust-based background runtime" mode="autonomous_code_patch"</code>
              </div>
            </div>

            {/* Box 2: BugAnalyzer */}
            <div className="md:col-span-4 bg-white border border-outline-variant p-8 flex flex-col justify-between group hover:border-primary-container transition-all duration-300">
              <div>
                <span className="material-symbols-outlined text-primary text-3xl mb-6">find_in_page</span>
                <h3 className="font-mono text-lg font-bold text-on-surface mb-2">02. BugAnalyzerAgent</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed italic mb-6">
                  "Deciphers messy human ticket descriptions into structured engineering context."
                </p>
              </div>
              <div className="h-24 bg-surface-container-low border border-outline-variant/40 p-4 flex flex-col gap-2 overflow-hidden justify-center rounded">
                <div className="h-1.5 w-3/4 bg-on-surface/10 rounded"></div>
                <div className="h-1.5 w-full bg-on-surface/10 rounded"></div>
                <div className="h-1.5 w-1/2 bg-primary/20 rounded"></div>
              </div>
            </div>

            {/* Box 3: CodeSearch */}
            <div className="md:col-span-4 bg-white border border-outline-variant p-8 flex flex-col group hover:border-primary-container transition-all duration-300">
              <span className="material-symbols-outlined text-primary text-3xl mb-6">search_insights</span>
              <h3 className="font-mono text-lg font-bold text-on-surface mb-2">03. CodeSearchAgent</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Clones the repository locally using simple-git, ignores noise, and conducts semantic keyword matching on the codebase to isolate the 10 most candidate files.
              </p>
            </div>

            {/* Box 4: RootCause */}
            <div className="md:col-span-4 bg-primary-container text-white p-8 flex flex-col group hover:brightness-110 transition-all duration-300">
              <span className="material-symbols-outlined text-white text-3xl mb-6">location_searching</span>
              <h3 className="font-mono text-lg font-bold text-white mb-2">04. RootCauseAgent</h3>
              <p className="text-xs text-white/80 leading-relaxed">
                The forensic analysis layer. It studies candidate file contents and pinpoints the exact file, logical fault, and line number range causing the bug using OpenAI's reasoning engine.
              </p>
            </div>

            {/* Box 5: FixGenerator */}
            <div className="md:col-span-4 bg-white border border-outline-variant p-8 flex flex-col justify-between group hover:border-primary-container transition-all duration-300">
              <div>
                <span className="material-symbols-outlined text-primary text-3xl mb-6">terminal</span>
                <h3 className="font-mono text-lg font-bold text-on-surface mb-2">05. FixGeneratorAgent</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Generates precise targeted code patches adhering to codebase styling rules, producing surgical, single-file minimal diffs.
                </p>
              </div>
              <div className="mt-4 bg-surface-container-low p-2 rounded border border-outline-variant/30 font-mono text-[10px] text-on-surface-variant">
                targetFile.replace(brokenRange, cleanCode);
              </div>
            </div>

            {/* Box 6: PRCreator */}
            <div className="md:col-span-12 bg-white border border-outline-variant p-8 flex flex-col justify-between group hover:border-primary-container transition-all duration-300">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary text-2xl">merge</span>
                  <h3 className="font-mono text-lg font-bold text-on-surface">06. PRCreatorAgent</h3>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed max-w-4xl">
                  Creates custom branches, commits files, and creates detailed, context-rich GitHub Pull Requests showing root cause explanations, OpenAI reasoning structures, and iii Engine event metrics.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary text-white text-[9px] font-mono flex items-center justify-center">BA</div>
                  <div className="w-6 h-6 rounded-full bg-surface-container-high border border-white text-[9px] font-mono flex items-center justify-center">🤖</div>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant/80">Verified & Approved by BugAgent</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Setup & Tech stack section */}
      <section id="setup" className="py-24 bg-white border-t border-outline-variant">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          
          <div className="max-w-2xl mb-16">
            <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2">
              Setup Requirements
            </div>
            <h2 className="font-mono text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Integrated with tools you trust.
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              No complex dependencies needed. Simply run BugAgent locally or connect the API wrapper. We rely on standard tools to manage codebase cloning and multi-agent loops:
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            
            <div className="flex flex-col gap-3 group">
              <div className="h-[2px] w-6 bg-primary/20 group-hover:w-full transition-all duration-300"></div>
              <div className="font-mono text-sm font-semibold">OpenAI API</div>
              <p className="text-xs text-on-surface-variant">The core reasoning model for fault finding and surgical code patch design.</p>
            </div>

            <div className="flex flex-col gap-3 group">
              <div className="h-[2px] w-6 bg-primary/20 group-hover:w-full transition-all duration-300"></div>
              <div className="font-mono text-sm font-semibold">iii Engine (Rust)</div>
              <p className="text-xs text-on-surface-variant">Language-agnostic background coordinator for APIs and worker states.</p>
            </div>

            <div className="flex flex-col gap-3 group">
              <div className="h-[2px] w-6 bg-primary/20 group-hover:w-full transition-all duration-300"></div>
              <div className="font-mono text-sm font-semibold">simple-git</div>
              <p className="text-xs text-on-surface-variant">Automates repository cloning, branch switching, and pushing.</p>
            </div>

            <div className="flex flex-col gap-3 group">
              <div className="h-[2px] w-6 bg-primary/20 group-hover:w-full transition-all duration-300"></div>
              <div className="font-mono text-sm font-semibold">iii-sdk</div>
              <p className="text-xs text-on-surface-variant">Multi-language worker SDK communicating directly with the Rust engine.</p>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
