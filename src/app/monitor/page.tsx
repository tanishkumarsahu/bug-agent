'use client'

import { useState, useEffect } from 'react'
import { WatchConfig, DetectedBug, MonitorSource } from '@/types'

const SOURCE_LABELS: Record<MonitorSource, string> = {
  'github-issues': 'GitHub Issues',
  reddit: 'Reddit',
  stackoverflow: 'Stack Overflow',
}

const SOURCE_ICONS: Record<MonitorSource, string> = {
  'github-issues': '🐙',
  reddit: '🟠',
  stackoverflow: '🔶',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-400 bg-gray-800 border-gray-700',
  running: 'text-yellow-400 bg-yellow-950/40 border-yellow-700',
  completed: 'text-green-400 bg-green-950/40 border-green-700',
  failed: 'text-red-400 bg-red-950/40 border-red-700',
  needs_human_review: 'text-orange-400 bg-orange-950/40 border-orange-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  running: 'Fixing...',
  completed: '✅ PR Opened',
  failed: '❌ Failed',
  needs_human_review: '⚠️ Needs Review',
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
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">🔍 Auto Monitor</h1>
        <p className="text-gray-400 text-sm">
          Watch GitHub Issues, Reddit, and Stack Overflow. When a bug report appears, BugAgent automatically fixes it and opens a PR.
        </p>
        {lastRefresh && (
          <p className="text-gray-600 text-xs mt-1">
            Last refreshed: {lastRefresh.toLocaleTimeString()} · auto-refreshes every 15s
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left: Add watch + active watches */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Add Watch form */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-semibold">Add Watch</p>

            {/* Source selector */}
            <div className="flex gap-2 mb-4">
              {(['github-issues', 'reddit', 'stackoverflow'] as MonitorSource[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                    source === s
                      ? 'bg-green-900 border-green-600 text-green-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {SOURCE_ICONS[s]} {SOURCE_LABELS[s].split(' ')[0]}
                </button>
              ))}
            </div>

            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <input
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600"
                placeholder="Watch label (e.g. React bug tracker)"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                required
              />

              {source === 'github-issues' && (
                <input
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600 font-mono"
                  placeholder="https://github.com/owner/repo"
                  value={form.repoUrl}
                  onChange={e => setForm(f => ({ ...f, repoUrl: e.target.value }))}
                  required
                />
              )}

              {source === 'reddit' && (
                <>
                  <input
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600"
                    placeholder="Subreddit (e.g. reactjs)"
                    value={form.subreddit}
                    onChange={e => setForm(f => ({ ...f, subreddit: e.target.value }))}
                    required
                  />
                  <input
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600 font-mono"
                    placeholder="Target repo URL to fix bugs in"
                    value={form.targetRepoUrl}
                    onChange={e => setForm(f => ({ ...f, targetRepoUrl: e.target.value }))}
                    required
                  />
                </>
              )}

              {source === 'stackoverflow' && (
                <>
                  <input
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600"
                    placeholder="Tags, comma-separated (e.g. reactjs, typescript)"
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    required
                  />
                  <input
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600 font-mono"
                    placeholder="Target repo URL to fix bugs in"
                    value={form.targetRepoUrl}
                    onChange={e => setForm(f => ({ ...f, targetRepoUrl: e.target.value }))}
                    required
                  />
                </>
              )}

              <input
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-600"
                placeholder="Keyword filter (optional, e.g. package name)"
                value={form.keyword}
                onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
              />

              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition"
              >
                {loading ? 'Adding...' : '+ Add Watch'}
              </button>
            </form>
          </div>

          {/* Active watches */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-semibold">
              Active Watches {watches.length > 0 && <span className="text-gray-400">({watches.length})</span>}
            </p>
            {watches.length === 0 ? (
              <p className="text-gray-600 text-sm">No watches yet. Add one above.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {watches.map(watch => {
                  const bugCount = bugs.filter(b => b.watchId === watch.id).length
                  return (
                    <div
                      key={watch.id}
                      className={`border rounded-xl p-3 transition ${
                        watch.active
                          ? 'border-gray-700 bg-gray-800/50'
                          : 'border-gray-800 bg-gray-800/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{SOURCE_ICONS[watch.source]}</span>
                            <span className="text-sm font-medium text-gray-200 truncate">{watch.label}</span>
                            {watch.active && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-mono truncate">
                            {watch.repoUrl || watch.subreddit
                              ? (watch.repoUrl || `r/${watch.subreddit}`)
                              : watch.tags?.join(', ')}
                          </p>
                          {bugCount > 0 && (
                            <p className="text-xs text-green-500 mt-1">{bugCount} bug{bugCount !== 1 ? 's' : ''} detected</p>
                          )}
                          {watch.lastCheckedAt > 0 && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              Checked {new Date(watch.lastCheckedAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleToggle(watch)}
                            className={`text-xs px-2 py-1 rounded-lg border transition ${
                              watch.active
                                ? 'border-gray-600 text-gray-400 hover:text-yellow-400 hover:border-yellow-600'
                                : 'border-gray-700 text-gray-500 hover:text-green-400 hover:border-green-600'
                            }`}
                          >
                            {watch.active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => handleRemove(watch.id)}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-700 transition"
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

        {/* Right: Detected bugs feed */}
        <div className="lg:col-span-3">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                Auto-Detected Bugs {bugs.length > 0 && <span className="text-gray-400">({bugs.length})</span>}
              </p>
              {bugs.some(b => b.sessionStatus === 'running') && (
                <span className="text-xs text-yellow-400 animate-pulse">● Fixing in progress</span>
              )}
            </div>

            {bugs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-500 text-sm">No bugs detected yet.</p>
                <p className="text-gray-600 text-xs mt-1">
                  Add a watch and BugAgent will automatically trigger when bugs appear.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bugs.map(bug => (
                  <div
                    key={bug.id}
                    className="border border-gray-700 rounded-xl p-4 bg-gray-800/40 hover:bg-gray-800/70 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm">{SOURCE_ICONS[bug.source]}</span>
                          <span className="text-xs text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">
                            {SOURCE_LABELS[bug.source]}
                          </span>
                          <span className="text-xs text-gray-600">
                            {new Date(bug.detectedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-200 mb-1 line-clamp-2">{bug.title}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">{bug.repoUrl}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {bug.sessionStatus ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[bug.sessionStatus] || STATUS_COLORS.pending}`}>
                            {STATUS_LABELS[bug.sessionStatus] || bug.sessionStatus}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full border text-gray-500 bg-gray-800 border-gray-700">
                            Queued
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700/50">
                      <a
                        href={bug.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-300 transition"
                      >
                        View source →
                      </a>
                      {bug.sessionId && (
                        <a
                          href={`/session/${bug.sessionId}`}
                          className="text-xs text-green-500 hover:text-green-400 transition"
                        >
                          Watch agent →
                        </a>
                      )}
                      {bug.prUrl && (
                        <a
                          href={bug.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 transition ml-auto"
                        >
                          Open PR →
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
