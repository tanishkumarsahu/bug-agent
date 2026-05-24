'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState('')
  const [bugTitle, setBugTitle] = useState('')
  const [bugDescription, setBugDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">File a bug. Get a PR.</h1>
          <p className="text-gray-400">BugAgent analyzes your repo, writes a fix, and opens a GitHub PR — automatically.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">GitHub Repo URL</label>
            <input
              type="url"
              required
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Bug Title</label>
            <input
              type="text"
              required
              value={bugTitle}
              onChange={e => setBugTitle(e.target.value)}
              placeholder="Login button not working on mobile"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Bug Description</label>
            <textarea
              required
              rows={4}
              value={bugDescription}
              onChange={e => setBugDescription(e.target.value)}
              placeholder="Describe what you expected to happen vs what actually happened..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-900 disabled:text-green-700 text-black font-semibold rounded-lg px-4 py-3 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Starting analysis...
              </>
            ) : (
              'Analyze & Fix →'
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Only public GitHub repos. JavaScript / TypeScript projects only.
        </p>
      </div>
    </div>
  )
}
