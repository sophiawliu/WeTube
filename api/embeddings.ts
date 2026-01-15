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
    const { input } = req.body

    if (!input || !Array.isArray(input)) {
      return res.status(400).json({ error: 'Invalid input: expected array of strings' })
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return res.status(response.status).json(error)
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('Embeddings API error:', error)
    return res.status(500).json({ error: 'Failed to get embeddings' })
  }
}
