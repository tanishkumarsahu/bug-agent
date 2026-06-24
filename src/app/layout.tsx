import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'BugAgent — File a bug. Get a PR.',
  description: 'Autonomous multi-agent bug fixer powered by Claude 3.5 Sonnet & Playwright',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Material Symbols Outlined */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-surface min-h-screen flex flex-col font-sans selection:bg-primary-container selection:text-white">
        
        {/* Premium Top Navigation Bar */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-[0.5px] border-outline-variant">
          <nav className="flex justify-between items-center h-16 px-6 md:px-10 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-8">
              <Link href="/" className="font-mono text-lg font-bold text-primary tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                <span>BugAgent</span>
              </Link>
              <div className="hidden md:flex gap-6 items-center">
                <Link href="/" className="text-sm font-medium text-primary hover:text-primary transition-colors">
                  Home
                </Link>
                <a href="/#how-it-works" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
                  How it Works
                </a>
                <Link href="/monitor" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Auto Monitor
                </Link>
                <a href="/#setup" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
                  Setup
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-outline-variant text-xs font-mono font-medium hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">code</span>
                GitHub
              </a>
              <a 
                href="/#get-started" 
                className="bg-primary-container text-white px-5 py-2 text-xs font-mono font-semibold tracking-wider uppercase hover:opacity-90 transition-all"
              >
                Get Started
              </a>
            </div>
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Global technical footer */}
        <footer className="bg-white border-t border-outline-variant py-10 mt-auto">
          <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col gap-1.5 max-w-sm">
              <div className="font-mono text-md font-bold text-on-surface">BugAgent</div>
              <p className="text-xs text-on-surface-variant">
                Autonomous bug resolution agent for public JS/TS repositories.
              </p>
            </div>
            <div className="flex gap-6 text-xs font-mono uppercase tracking-wider text-on-surface-variant">
              <Link href="/" className="hover:text-primary hover:underline">Home</Link>
              <a href="/#how-it-works" className="hover:text-primary hover:underline">Orchestration</a>
              <Link href="/monitor" className="hover:text-primary hover:underline">Monitor</Link>
            </div>
            <div className="text-[10px] font-mono text-on-surface-variant/60">
              © 2026 BugAgent. All lines autonomous.
            </div>
          </div>
        </footer>

      </body>
    </html>
  )
}
