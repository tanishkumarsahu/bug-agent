export type AgentName =
  | 'OrchestratorAgent'
  | 'BugAnalyzerAgent'
  | 'CodeSearchAgent'
  | 'RootCauseAgent'
  | 'FixGeneratorAgent'
  | 'TestRunnerAgent'
  | 'PRCreatorAgent'

export type SessionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'needs_human_review'

export interface AgentEvent {
  agent: AgentName
  status: 'running' | 'done' | 'failed' | 'retrying'
  message: string
  timestamp: number
}

export interface BugContext {
  title: string
  description: string
  affectedFeature: string
  expectedBehavior: string
  actualBehavior: string
  searchKeywords: string[]
  likelyFileTypes: string[]
}

export interface RelevantFile {
  path: string
  content: string
  relevanceScore: number
}

export interface RootCause {
  file: string
  lineStart: number
  lineEnd: number
  explanation: string
  confidence: 'high' | 'medium' | 'low'
}

export interface FixResult {
  fixedFilePath: string
  fixedFileContent: string
  testFilePath: string
  testFileContent: string
  diffSummary: string
}

export interface TestResult {
  passed: boolean
  output: string
  errorDetails?: string
}

export interface Session {
  id: string
  status: SessionStatus
  repoUrl: string
  bugTitle: string
  bugDescription: string
  repoLocalPath?: string
  bugContext?: BugContext
  relevantFiles?: RelevantFile[]
  rootCause?: RootCause
  fixResult?: FixResult
  testResult?: TestResult
  prUrl?: string
  attempts: number
  events: AgentEvent[]
  createdAt: number
}
