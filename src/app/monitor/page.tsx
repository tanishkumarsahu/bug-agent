'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { WatchConfig, DetectedBug, MonitorSource } from '@/types'

const SOURCE_LABELS: Record<MonitorSource, string> = {
  'github-issues': 'GitHub Issues',
  reddit: 'Reddit Feed',
  stackoverflow: 'Stack Overflow',
}

const SOURCE_ICONS: Record<MonitorSource, string> = {
  'github-issues': 'code',
  reddit: 'forum',
  stackoverflow: 'question_answer',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-on-surface bg-surface-container-low border-outline-variant/60',
  running: 'text-yellow-700 bg-yellow-50 border-yellow-200/60',
  completed: 'text-green-700 bg-green-50 border-green-200/60',
  failed: 'text-error bg-red-50 border-error/20',
  needs_human_review: 'text-orange-700 bg-orange-50 border-orange-200/60',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Queued',
  running: 'Fixing...',
  completed: '✓ PR Opened',
  failed: '✗ Failed',
  needs_human_review: '⚠ Review Req.',
}

type EnrichedBug = DetectedBug & { sessionStatus?: string; prUrl?: string }

const EMPTY_FORM = {
  label: '',
  repoUrl: '',
  subreddit: '',
  tags: '',
  targetRepoUrl: '',
  keyword: '',
}

export default function MonitorPage() {
  const [watches, setWatches] = useState<WatchConfig[]>([])
  const [bugs, setBugs] = useState<EnrichedBug[]>([])
  const [source, setSource] = useState<MonitorSource>('github-issues')
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function refresh() {
    try {
      const res = await fetch('/api/monitor')
      const data = await res.json()
      setWatches(data.watches || [])
      setBugs(data.bugs || [])
      setLastRefresh(new Date())
    } catch {}
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15_000)
    return () => clearInterval(interval)
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          label: form.label,
          repoUrl: source === 'github-issues' ? form.repoUrl : undefined,
          subreddit: source === 'reddit' ? form.subreddit : undefined,
          tags: source === 'stackoverflow'
            ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
            : undefined,
          targetRepoUrl: source !== 'github-issues' ? form.targetRepoUrl : undefined,
          keyword: form.keyword || undefined,
        }),
      })
      setForm(EMPTY_FORM)
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(watch: WatchConfig) {
    await fetch(`/api/monitor/${watch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !watch.active }),
    })
    await refresh()
  }

  async function handleRemove(id: string) {
    await fetch(`/api/monitor/${id}`, { method: 'DELETE' })
    await refresh()
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 w-full text-on-surface">

      {/* Page header */}
      <div className="mb-12 border-b border-outline-variant/60 pb-8">
        <div className="font-mono text-xs uppercase tracking-widest text-primary font-semibold mb-2">
          Automated Watchdogs
        </div>
        <h1 className="font-mono text-3xl md:text-4xl font-bold tracking-tight mb-3">
          🔍 Auto Monitor Dashboard
        </h1>
        <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
          Configure triggers to watch GitHub Issues, Stack Overflow tags, or Reddit communities. When a bug report matches your keywords, BugAgent automatically kicks off the repair pipeline, runs browser tests, and spawns a fix PR.
        </p>
        {lastRefresh && (
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-mono text-on-surface-variant/70">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span>Refreshed: {lastRefresh.toLocaleTimeString()} · Auto-polls every 15s</span>
          </div>
        )}
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left column: Add watch and Active watch config lists */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">

          {/* Add Watch Form Container */}
          <div className="bg-white border border-outline-variant p-6 md:p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-6">
              Create New Monitor
            </p>

            {/* Source channel selectors */}
            <div className="flex gap-2 mb-6">
              {(['github-issues', 'reddit', 'stackoverflow'] as MonitorSource[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`flex-1 py-2 border font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    source === s
                      ? 'bg-primary-container border-primary-container text-white'
                      : 'bg-white border-outline-variant text-on-surface-variant/80 hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {SOURCE_ICONS[s]}
                  </span>
                  <span>{SOURCE_LABELS[s].split(' ')[0]}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              
              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                  Monitor Label
                </label>
                <input
                  className="w-full bg-white border border-outline-variant px-3.5 py-2.5 text-xs placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded font-mono"
                  placeholder="e.g., Core Auth Repo Tracker"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  required
                />
              </div>

              {source === 'github-issues' && (
                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                    Target Repository URL
                  </label>
                  <input
                    type="url"
                    className="w-full bg-white border border-outline-variant px-3.5 py-2.5 text-xs placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded font-mono"
                    placeholder="https://github.com/owner/repository"
                    value={form.repoUrl}
                    onChange={e => setForm(f => ({ ...f, repoUrl: e.target.value }))}
                    required
                  />
                </div>
              )}

              {source === 'reddit' && (
                <>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                      Subreddit community
                    </label>
                    <input
                      className="w-full bg-white border border-outline-variant px-3.5 py-2.5 text-xs placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded font-mono"
                      placeholder="e.g., reactjs"
                      value={form.subreddit}
                      onChange={e => setForm(f => ({ ...f, subreddit: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                      Codebase target Repo URL to fix
                    </label>
                    <input
                      type="url"
                      className="w-full bg-white border border-outline-variant px-3.5 py-2.5 text-xs placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded font-mono"
                      placeholder="https://github.com/owner/repository"
                      value={form.targetRepoUrl}
                      onChange={e => setForm(f => ({ ...f, targetRepoUrl: e.target.value }))}
                      required
                    />
                  </div>
                </>
              )}

              {source === 'stackoverflow' && (
                <>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                      Tag filters (comma separated)
                    </label>
                    <input
                      className="w-full bg-white border border-outline-variant px-3.5 py-2.5 text-xs placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded font-mono"
                      placeholder="e.g., reactjs, typescript"
                      value={form.tags}
                      onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                      Codebase target Repo URL to fix
                    </label>
                    <input
                      type="url"
                      className="w-full bg-white border border-outline-variant px-3.5 py-2.5 text-xs placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded font-mono"
                      placeholder="https://github.com/owner/repository"
                      value={form.targetRepoUrl}
                      onChange={e => setForm(f => ({ ...f, targetRepoUrl: e.target.value }))}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="block font-mono text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                  Optional keyword filter
                </label>
                <input
                  className="w-full bg-white border border-outline-variant px-3.5 py-2.5 text-xs placeholder-on-surface-variant/40 focus:ring-1 focus:ring-primary-container focus:border-primary-container focus:outline-none rounded font-mono"
                  placeholder="e.g., @auth-provider"
                  value={form.keyword}
                  onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-primary-container text-white py-3 mt-2 font-mono text-xs font-semibold uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all rounded flex items-center justify-center gap-1.5"
              >
                {loading ? 'Creating Watchdog...' : '+ Register Watchdog'}
              </button>
            </form>
          </div>

          {/* Active Watches Configuration List */}
          <div className="bg-white border border-outline-variant p-6">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-outline-variant/40">
              <span className="font-mono text-xs uppercase tracking-widest text-on-surface-variant font-bold">
                Registered Watchdogs
              </span>
              {watches.length > 0 && (
                <span className="text-[10px] font-mono bg-surface-container text-primary font-semibold px-2 py-0.5 rounded">
                  {watches.length} active
                </span>
              )}
            </div>

            {watches.length === 0 ? (
              <p className="text-xs text-on-surface-variant/60 font-mono italic text-center py-6">
                No active watchdogs configured. Register one above to monitor bugs.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {watches.map(watch => {
                  const bugCount = bugs.filter(b => b.watchId === watch.id).length
                  return (
                    <div
                      key={watch.id}
                      className={`border p-4 rounded transition-all duration-300 ${
                        watch.active
                          ? 'border-outline-variant bg-white'
                          : 'border-outline-variant/40 bg-surface-container-low/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              {SOURCE_ICONS[watch.source]}
                            </span>
                            <span className="text-xs font-mono font-bold text-on-surface truncate">
                              {watch.label}
                            </span>
                            {watch.active && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-[10px] text-on-surface-variant font-mono truncate">
                            {watch.repoUrl || watch.subreddit
                              ? (watch.repoUrl || `r/${watch.subreddit}`)
                              : watch.tags?.join(', ')}
                          </p>

                          {bugCount > 0 && (
                            <p className="text-[10px] font-mono text-green-700 font-bold bg-green-50 inline-block px-1.5 py-0.5 mt-1 border border-green-200/50">
                              {bugCount} Bug{bugCount !== 1 ? 's' : ''} Intercepted
                            </p>
                          )}
                          
                          {watch.lastCheckedAt > 0 && (
                            <p className="text-[9px] text-on-surface-variant/50 font-mono">
                              Checked: {new Date(watch.lastCheckedAt).toLocaleTimeString()}
                            </p>
                          )}

                        </div>

                        {/* Watch toggle buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <button
                            onClick={() => handleToggle(watch)}
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-1 border transition-all ${
                              watch.active
                                ? 'border-outline-variant text-on-surface-variant hover:text-yellow-600 hover:border-yellow-600'
                                : 'border-outline-variant/60 text-on-surface-variant/60 hover:text-green-600 hover:border-green-600'
                            }`}
                          >
                            {watch.active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => handleRemove(watch.id)}
                            className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-1 border border-outline-variant text-on-surface-variant/60 hover:text-error hover:border-error transition-all"
                          >
                            ✕
                          </button>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right column: Auto-Detected Bugs feed */}
        <div className="lg:col-span-7 w-full">
          <div className="bg-white border border-outline-variant p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-2 border-b border-outline-variant/40">
              <span className="font-mono text-xs uppercase tracking-widest text-on-surface-variant font-bold">
                Auto-Detected & Repaired Bugs
              </span>
              {bugs.some(b => b.sessionStatus === 'running') && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-yellow-700 bg-yellow-50 px-2 py-1 border border-yellow-200 animate-pulse">
                  ● Fix In Progress
                </span>
              )}
            </div>

            {bugs.length === 0 ? (
              <div className="text-center py-20">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-3 block">
                  location_searching
                </span>
                <p className="font-mono text-xs text-on-surface-variant/80">
                  No automated bug files intercepted yet.
                </p>
                <p className="text-xs text-on-surface-variant/50 max-w-sm mx-auto mt-2 leading-relaxed">
                  As soon as one of your active watchdogs detects a thread, BugAgent will capture it and begin repairing it in the background automatically.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {bugs.map(bug => (
                  <div
                    key={bug.id}
                    className="border border-outline-variant p-5 rounded bg-white hover:brightness-[0.99] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                            {SOURCE_ICONS[bug.source]}
                          </span>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-widest bg-surface-container-low text-on-surface px-2 py-0.5 border border-outline-variant/30">
                            {SOURCE_LABELS[bug.source]}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/60 font-mono">
                            {new Date(bug.detectedAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-on-surface leading-tight">
                          {bug.title}
                        </h3>

                        <p className="text-[10px] text-on-surface-variant font-mono truncate">
                          Target Repo: {bug.repoUrl}
                        </p>

                      </div>

                      {/* Status badge */}
                      <div className="shrink-0">
                        {bug.sessionStatus ? (
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 border rounded-full ${STATUS_COLORS[bug.sessionStatus] || STATUS_COLORS.pending}`}>
                            {STATUS_LABELS[bug.sessionStatus] || bug.sessionStatus}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 border rounded-full text-on-surface-variant bg-surface-container border-outline-variant/50">
                            Queued
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Operational action items */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-outline-variant/40">
                      
                      <a
                        href={bug.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono font-bold uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                      >
                        Source Thread
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                      
                      {bug.sessionId && (
                        <Link
                          href={`/session/${bug.sessionId}`}
                          className="text-[10px] font-mono font-bold uppercase text-primary hover:underline flex items-center gap-1"
                        >
                          Watch Agent Run
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </Link>
                      )}
                      
                      {bug.prUrl && (
                        <a
                          href={bug.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono font-bold uppercase text-green-700 bg-green-50 border border-green-200/50 px-2 py-0.5 rounded ml-auto hover:bg-green-100 transition-colors"
                        >
                          Open PR
                        </a>
                      )}
                      
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
