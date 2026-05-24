import { WatchConfig, DetectedBug, MonitorSource } from '@/types'

const watches = new Map<string, WatchConfig>()
const detectedBugs = new Map<string, DetectedBug>()

export function addWatch(
  config: Omit<WatchConfig, 'id' | 'createdAt' | 'lastCheckedAt' | 'seenIds' | 'autoSessionIds'>
): WatchConfig {
  const id = `watch_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
  const watch: WatchConfig = {
    ...config,
    id,
    lastCheckedAt: 0,
    seenIds: [],
    autoSessionIds: [],
    createdAt: Date.now(),
  }
  watches.set(id, watch)
  return watch
}

export function getWatches(): WatchConfig[] {
  return Array.from(watches.values())
}

export function getWatch(id: string): WatchConfig | undefined {
  return watches.get(id)
}

export function updateWatch(id: string, updates: Partial<WatchConfig>): void {
  const w = watches.get(id)
  if (w) watches.set(id, { ...w, ...updates })
}

export function removeWatch(id: string): void {
  watches.delete(id)
}

export function addDetectedBug(
  bug: Omit<DetectedBug, 'id'>
): DetectedBug {
  const id = `bug_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
  const full: DetectedBug = { ...bug, id }
  detectedBugs.set(id, full)
  return full
}

export function updateDetectedBug(id: string, updates: Partial<DetectedBug>): void {
  const bug = detectedBugs.get(id)
  if (bug) detectedBugs.set(id, { ...bug, ...updates })
}

export function getDetectedBugs(): DetectedBug[] {
  return Array.from(detectedBugs.values()).sort((a, b) => b.detectedAt - a.detectedAt)
}
