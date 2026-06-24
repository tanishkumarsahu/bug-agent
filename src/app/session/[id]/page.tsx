'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AgentEvent, AgentName } from '@/types'

const AGENT_ORDER: AgentName[] = [
  'BugAnalyzerAgent',
  'CodeSearchAgent',
  'RootCauseAgent',
  'FixGeneratorAgent',
  'TestRunnerAgent',
  'PRCreatorAgent',
]

const AGENT_LABELS: Record<AgentName, string> = {
  OrchestratorAgent: 'Orchestrator',
  BugAnalyzerAgent: 'Bug Analyzer',
  CodeSearchAgent: 'Code Search',
  RootCauseAgent: 'Root Cause',
  FixGeneratorAgent: 'Fix Generator',
  TestRunnerAgent: 'Test Runner',
  PRCreatorAgent: 'PR Creator',
}

const AGENT_ICONS: Record<AgentName, string> = {
  OrchestratorAgent: 'smart_toy',
  BugAnalyzerAgent: 'find_in_page',
  CodeSearchAgent: 'search_insights',
  RootCauseAgent: 'location_searching',
  FixGeneratorAgent: 'terminal',
  TestRunnerAgent: 'science',
  PRCreatorAgent: 'merge',
}

type AgentState = 'waiting' | 'running' | 'done' | 'failed' | 'retrying'

interface ResultData {
  status: string
  prUrl?: string
  rootCause?: { file: string; lineStart: number; lineEnd: number; explanation: string; confidence: string }
  fixSummary?: string
  attempts?: number
  testsPassed?: boolean
}

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string

  const [events, setEvents] = useState<AgentEvent[]>([])
  const [agentStates, setAgentStates] = useState<Record<AgentName, AgentState>>({} as Record<AgentName, AgentState>)
  const [result, setResult] = useState<ResultData | null>(null)
  const [sessionDone, setSessionDone] = useState(false)
  const [attempts, setAttempts] = useState(1)

  const logRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  // Derive agent states from events
  useEffect(() => {
    const states: Record<AgentName, AgentState> = {} as Record<AgentName, AgentState>
    for (const event of events) {
      if (event.agent === 'OrchestratorAgent') continue
      states[event.agent] = event.status as AgentState
      if (event.status === 'retrying') setAttempts(a => Math.max(a, 2))
    }
    setAgentStates(states)
  }, [events])

  // Auto-scroll terminal
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [events.length])

  // SSE connection
  useEffect(() => {
    const es = new EventSource(`/api/agent/stream?sessionId=${sessionId}`)
    esRef.current = es

    es.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data)
      setEvents(prev => [...prev, event])
    }

    es.onerror = () => {
      es.close()
      setSessionDone(true)
    }

    return () => es.close()
  }, [sessionId])

  // Poll for result once SSE closes
  useEffect(() => {
    if (!sessionDone) return
    let active = true
    const poll = async () => {
      try {
        const res = await fetch(`/api/agent/result?sessionId=${sessionId}`)
        const data = await res.json()
        if (['completed', 'failed', 'needs_human_review'].includes(data.status)) {
          if (active) setResult(data)
          return
        }
      } catch {}
      if (active) setTimeout(poll, 2000)
    }
    poll()
    return () => {
      active = false
    }
  }, [sessionDone, sessionId])

  // Also set sessionDone when orchestrator emits done/failed
  useEffect(() => {
    const last = events[events.length - 1]
    if (last?.agent === 'OrchestratorAgent' && (last.status === 'done' || last.status === 'failed')) {
      setSessionDone(true)
    }
  }, [events])

  const isRetrying = Object.values(agentStates).some(s => s === 'retrying')

  return (
    <div className="flex-1 flex flex-col bg-background text-on-surface">
      
      {/* 1. Header session info bar */}
      <div className="bg-white border-b border-outline-variant px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-on-surface-variant font-medium">
            SESSION: <span className="text-on-surface bg-surface-container-low px-2 py-0.5 rounded font-bold">{sessionId}</span>
          </span>
          <div className="h-4 w-[1px] bg-outline-variant" />
          <span className="font-mono text-xs text-on-surface-variant">
            Attempts: <span className="text-on-surface font-semibold">{attempts}/3</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {result?.status === 'completed' && (
            <span className="text-xs font-mono font-medium bg-green-50 border border-green-200 text-green-700 px-3 py-1 uppercase tracking-wider">
              ● Finished Successfully
            </span>
          )}
          {result?.status === 'needs_human_review' && (
            <span className="text-xs font-mono font-medium bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1 uppercase tracking-wider">
              ▲ Needs Human Review
            </span>
          )}
          {result?.status === 'failed' && (
            <span className="text-xs font-mono font-medium bg-red-50 border border-red-200 text-red-700 px-3 py-1 uppercase tracking-wider">
              ■ Failed
            </span>
          )}
          {!result && (
            <span className="text-xs font-mono font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 uppercase tracking-wider animate-pulse">
              ⚙ Running Pipeline
            </span>
          )}
        </div>
      </div>

      {/* 2. Main split view dashboard */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-10.5rem)]">
        
        {/* Left: Active agent pipeline nodes */}
        <div className="lg:col-span-4 border-r border-outline-variant p-6 flex flex-col bg-white overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <span className="font-mono text-xs uppercase tracking-widest text-on-surface-variant font-semibold">
              Orchestrator Thread
            </span>
            <h2 className="text-xl font-mono font-bold mt-1 text-on-surface">Agent Status</h2>
          </div>

          <div className="flex flex-col gap-1.5 max-w-sm w-full">
            {AGENT_ORDER.map((agent, i) => {
              const state = agentStates[agent] || 'waiting'
              
              // Define node background, borders, and colors based on execution state
              let cardBg = 'bg-white border-outline-variant text-on-surface-variant/70'
              let dotColor = 'bg-outline-variant'
              let animatePulse = false
              
              if (state === 'running') {
                cardBg = 'bg-indigo-50/50 border-primary-container text-on-surface'
                dotColor = 'bg-primary-container'
                animatePulse = true
              } else if (state === 'done') {
                cardBg = 'bg-white border-outline text-on-surface'
                dotColor = 'bg-green-600'
              } else if (state === 'failed') {
                cardBg = 'bg-red-50/30 border-error text-error'
                dotColor = 'bg-error'
              } else if (state === 'retrying') {
                cardBg = 'bg-orange-50/30 border-orange-500 text-orange-700'
                dotColor = 'bg-orange-500 animate-pulse'
              }

              return (
                <div key={agent} className="w-full">
                  <div className={`border p-4 rounded transition-all duration-300 flex items-center gap-4 ${cardBg}`}>
                    
                    {/* Node status dot indicator */}
                    <div className="relative flex items-center justify-center shrink-0">
                      {animatePulse && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-primary-container/30 animate-ping" />
                      )}
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                    </div>

                    {/* Agent details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                          {AGENT_ICONS[agent]}
                        </span>
                        <p className="text-xs font-mono font-semibold truncate uppercase tracking-wider">
                          {AGENT_LABELS[agent]}
                        </p>
                      </div>
                      <p className="text-[11px] text-on-surface-variant font-mono mt-0.5 capitalize">
                        {state === 'waiting' ? 'Queued' : state}
                      </p>
                    </div>

                    {/* Status icons right */}
                    <div className="shrink-0 font-mono text-xs">
                      {state === 'done' && <span className="text-green-600 font-bold">✓</span>}
                      {state === 'failed' && <span className="text-error font-bold">✗</span>}
                      {state === 'retrying' && <span className="text-orange-500">↺</span>}
                      {state === 'running' && (
                        <span className="w-1.5 h-1.5 bg-primary-container rounded-full animate-bounce" />
                      )}
                    </div>

                  </div>

                  {/* Vertical dotted connector line between cards */}
                  {i < AGENT_ORDER.length - 1 && (
                    <div className="flex justify-start pl-[21px]">
                      <div className={`w-[1px] h-4 flow-line`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {isRetrying && (
            <div className="mt-6 text-xs text-orange-700 bg-orange-50 border border-orange-200/50 p-4 font-mono">
              [WARNING]: Fix attempt failed. Direct worker SDK feedback received. Initiating retry loop (Attempt 2/3).
            </div>
          )}
        </div>

        {/* Right: Modern terminal logs */}
        <div className="lg:col-span-8 flex flex-col bg-[#0A0A0A] overflow-hidden">
          
          {/* Terminal control bar */}
          <div className="bg-[#141414] h-10 border-b border-white/5 flex items-center justify-between px-5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
            </div>
            <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
              Live Console Output Stream
            </span>
            <div className="w-12" />
          </div>

          {/* Terminal stream console */}
          <div 
            ref={logRef}
            className="flex-1 p-6 overflow-y-auto custom-scrollbar font-mono text-xs text-white/80 space-y-2 leading-relaxed bg-[#0A0A0A]"
          >
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-white/20 select-none">
                <span className="material-symbols-outlined text-[36px] mb-2 animate-spin">sync</span>
                <p className="text-[11px] uppercase tracking-wider font-semibold">Connecting to active run...</p>
              </div>
            )}
            
            {events.map((event, i) => {
              // Color tags based on agent and state
              let messageColor = 'text-white'
              if (event.status === 'done') messageColor = 'text-green-400'
              if (event.status === 'failed') messageColor = 'text-red-400 font-semibold'
              if (event.status === 'retrying') messageColor = 'text-orange-400 font-semibold'

              return (
                <div key={i} className="flex gap-4 items-start select-text border-b border-white/[0.02] pb-1">
                  <span className="text-white/30 shrink-0 select-none">
                    [{new Date(event.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="text-indigo-400 shrink-0 w-28 truncate select-none uppercase font-bold text-[10px]">
                    {AGENT_LABELS[event.agent] || event.agent}
                  </span>
                  <span className={`${messageColor} whitespace-pre-wrap flex-1`}>
                    {event.message}
                  </span>
                </div>
              )
            })}
            
            {sessionDone && !result && (
              <div className="text-white/40 flex items-center gap-2 pt-2 select-none">
                <span className="w-1 h-1.5 bg-white/40 animate-pulse" />
                <span>Closing session. Compiling final metrics report...</span>
              </div>
            )}
            
            {events.length > 0 && <span className="terminal-cursor text-white/60 block select-none" />}
          </div>

        </div>

      </div>

      {/* 3. dynamic Premium Result Card Bottom panel */}
      {result && (
        <section className="bg-white border-t border-outline-variant p-8 md:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Row 1: Success PR Container */}
            {result.prUrl ? (
              <a
                href={result.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col sm:flex-row items-center justify-between bg-green-50 border border-green-200/60 p-6 rounded gap-4 hover:brightness-[0.98] transition-all group"
              >
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-green-700 font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Pull Request Created Successfully
                  </h3>
                  <p className="text-sm font-mono text-on-surface font-semibold truncate max-w-xl">
                    {result.prUrl}
                  </p>
                </div>
                <div className="bg-primary-container text-white px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider shrink-0 flex items-center gap-2 group-hover:translate-x-0.5 transition-transform">
                  Open Pull Request
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              </a>
            ) : (
              <div className="bg-red-50 border border-red-200/50 p-6 rounded text-center sm:text-left">
                <h3 className="font-mono text-xs uppercase tracking-widest text-error font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Orchestrator Session Concluded without PR
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  The active fix attempts failed to successfully compile or execute inside the Rust-based iii Engine, or the target codebase could not build cleanly.
                </p>
              </div>
            )}

            {/* Row 2: Root cause & Fix breakdown grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Box 1: Root Cause */}
              {result.rootCause && (
                <div className="border border-outline-variant p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold block">
                      Detected Root Cause
                    </span>
                    <p className="text-xs text-on-surface leading-relaxed">
                      {result.rootCause.explanation}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-outline-variant/50">
                    <span className="font-mono text-[10px] text-on-surface-variant block truncate">
                      File: {result.rootCause.file.split('/').pop()}
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant block">
                      Lines: {result.rootCause.lineStart} – {result.rootCause.lineEnd}
                    </span>
                    <span className={`inline-block mt-3 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border ${
                      result.rootCause.confidence === 'high' 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    }`}>
                      {result.rootCause.confidence} confidence
                    </span>
                  </div>
                </div>
              )}

              {/* Box 2: Fix Summary */}
              {result.fixSummary && (
                <div className="border border-outline-variant p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold block">
                      Implemented Fix Summary
                    </span>
                    <p className="text-xs text-on-surface leading-relaxed">
                      {result.fixSummary}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-outline-variant/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-green-600">verified</span>
                    <span className="font-mono text-[10px] text-on-surface-variant">Applied automatically via FS Patch</span>
                  </div>
                </div>
              )}

              {/* Box 3: Verification metrics */}
              <div className="border border-outline-variant p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-bold block">
                    Execution Metrics
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center font-mono text-[10px] font-bold text-on-surface">
                      {result.attempts}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        Pipeline Fix Runs
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-mono">
                        Active orchestration cycles
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-mono text-xs font-bold">
                      ✓
                    </span>
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        iii Engine Coordinated
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-mono">
                        Rust background worker sdk thread
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-outline-variant/50">
                  <Link
                    href="/"
                    className="w-full block text-center bg-surface-container-low border border-outline-variant text-xs font-mono font-semibold uppercase tracking-wider py-2.5 hover:bg-surface-container-high transition-colors"
                  >
                    Fix Another Bug
                  </Link>
                </div>

              </div>

            </div>

          </div>
        </section>
      )}

    </div>
  )
}
