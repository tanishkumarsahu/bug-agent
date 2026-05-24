import type { Metadata } from 'next'
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
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
            <span className="text-xl">🤖</span>
            <span className="font-bold text-green-400 text-lg tracking-tight">BugAgent</span>
            <span className="text-gray-500 text-sm">— autonomous bug fixer</span>
          </div>
        </header>
        <main className="pt-14">
          {children}
        </main>
      </body>
    </html>
  )
}
