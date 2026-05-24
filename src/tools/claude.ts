import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')
  return content
}
