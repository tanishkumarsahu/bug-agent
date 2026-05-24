import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'BugAgent — File a bug. Get a PR.',
  description: 'Autonomous multi-agent bug fixer powered by GPT-4o',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="text-xl">🤖</span>
              <span className="font-bold text-green-400 text-lg tracking-tight">BugAgent</span>
            </Link>
            <span className="text-gray-700 text-sm hidden sm:block">— autonomous bug fixer</span>
            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
              >
                Manual Fix
              </Link>
              <Link
                href="/monitor"
                className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition flex items-center gap-1.5"
              >
                <span className="text-green-500">●</span> Auto Monitor
              </Link>
            </div>
          </div>
        </header>
        <main className="pt-14">
          {children}
        </main>
      </body>
    </html>
  )
}
