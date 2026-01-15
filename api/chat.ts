import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' })
  }

  try {
    const { model, messages, response_format, temperature } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages: expected array' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        response_format,
        temperature: temperature ?? 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return res.status(response.status).json(error)
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ error: 'Failed to get chat completion' })
  }
}
