import OpenAI from 'openai'

// Gemini exposes an OpenAI-compatible endpoint, so we reuse the OpenAI SDK.
const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
})

// Free-tier Gemini models have tiny per-day limits (~20 requests/day each).
// We try them in order: when one is rate-limited/exhausted (429), fall through
// to the next — each model has its own separate quota.
const MODELS = (process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite,gemini-3.5-flash,gemini-flash-latest')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)

const RETRIES_PER_MODEL = 3

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callModel(model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: 8192,
    // gemini-2.5+ models enable "thinking" by default, which consumes the token
    // budget and truncates JSON output. These are structured extraction tasks,
    // so turn thinking off via the Gemini-specific param.
    reasoning_effort: 'none',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  } as unknown as Parameters<typeof client.chat.completions.create>[0])

  const choice = (response as { choices?: { message?: { content?: string }; finish_reason?: string }[] }).choices?.[0]
  const content = choice?.message?.content
  if (!content) throw new Error('Empty response from Gemini')
  if (choice?.finish_reason === 'length') {
    throw new Error('Gemini response was cut off (hit token limit) — output may be incomplete.')
  }
  return content
}

export async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  let lastErr: unknown

  for (const model of MODELS) {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      try {
        return await callModel(model, systemPrompt, userMessage)
      } catch (err: unknown) {
        lastErr = err
        const status = (err as { status?: number })?.status

        // Rate-limited or daily quota exhausted on this model — switch models.
        if (status === 429) break

        // Transient server errors — back off and retry the SAME model.
        if (status === 503 || status === 500) {
          await sleep(2000 * 2 ** attempt + Math.floor(Math.random() * 1000))
          continue
        }

        // Anything else (bad request, parse error, etc.) is not retryable.
        throw err
      }
    }
  }

  const msg = (lastErr as { message?: string })?.message || String(lastErr)
  throw new Error(
    `All Gemini models are rate-limited or unavailable (${msg}). ` +
      `Free-tier daily limits are likely exhausted — wait for the daily reset or enable billing.`
  )
}

// Models don't reliably honor "JSON only" — they may add code fences or prose.
// Strip fences, then fall back to extracting the first {...} or [...] block.
export function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/)
    if (!match) throw new Error(`Could not parse JSON from model response: ${cleaned.slice(0, 200)}`)
    return JSON.parse(match[0]) as T
  }
}
