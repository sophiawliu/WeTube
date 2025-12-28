import OpenAI from 'openai'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

export interface ClusterName {
  clusterId: number
  name: string
  confidence: number
}

export interface Claim {
  id: number
  text: string
  clusterIds: number[]
  commentCount: number
}

/**
 * Generate soft, evocative names for clusters
 * Names should feel like moods/feelings, not categories
 */
export async function generateClusterNames(
  clusters: { id: number; comments: string[] }[]
): Promise<ClusterName[]> {
  if (clusters.length === 0) return []

  const clusterDescriptions = clusters.map(c => 
    `Cluster ${c.id} (${c.comments.length} comments):\n${c.comments.slice(0, 10).map(text => `- "${text.slice(0, 150)}"`).join('\n')}`
  ).join('\n\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You name clusters of YouTube comments about music videos. 
          
Your names should be:
- Evocative and poetic, like "late-night solitude" or "childhood safety" or "post-breakup spiral"
- 2-4 words maximum
- Feelings/moods/experiences, NOT categories
- Lowercase, no punctuation

Respond with JSON array: [{"clusterId": number, "name": "string", "confidence": 0.0-1.0}]
Confidence reflects how coherent the cluster feels (1.0 = very tight theme, 0.5 = mixed).`
        },
        {
          role: 'user',
          content: `Name these comment clusters:\n\n${clusterDescriptions}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    const content = response.choices[0]?.message?.content
    if (!content) return clusters.map(c => ({ clusterId: c.id, name: 'unnamed feeling', confidence: 0.5 }))

    const parsed = JSON.parse(content)
    const names = parsed.clusters || parsed.names || parsed
    
    if (Array.isArray(names)) {
      return names.map((n: { clusterId?: number; cluster_id?: number; name?: string; confidence?: number }, i: number) => ({
        clusterId: n.clusterId ?? n.cluster_id ?? clusters[i]?.id ?? i,
        name: n.name || 'unnamed feeling',
        confidence: n.confidence ?? 0.7
      }))
    }

    return clusters.map(c => ({ clusterId: c.id, name: 'unnamed feeling', confidence: 0.5 }))
  } catch (error) {
    console.error('Failed to generate cluster names:', error)
    return clusters.map(c => ({ clusterId: c.id, name: 'unnamed feeling', confidence: 0.5 }))
  }
}

/**
 * Generate accountable prose claims from clusters
 * Each claim cites comment counts and remains epistemically humble
 */
export async function generateClaims(
  clusters: { id: number; name: string; comments: string[]; confidence: number }[]
): Promise<Claim[]> {
  if (clusters.length === 0) return []

  const totalComments = clusters.reduce((sum, c) => sum + c.comments.length, 0)
  
  const clusterSummary = clusters.map(c => 
    `"${c.name}" (${c.comments.length} comments, ${Math.round(c.confidence * 100)}% coherent):\n${c.comments.slice(0, 5).map(text => `  - "${text.slice(0, 100)}"`).join('\n')}`
  ).join('\n\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You write prose summaries of how people respond to music. Your writing must be:

1. ACCOUNTABLE: Every claim cites a count, e.g. "Many listeners describe... (132 comments)"
2. HUMBLE: Use hedging language - "seem to", "many describe", "a smaller group"
3. PLURAL: Acknowledge different experiences, including minority views
4. REVERSIBLE: Write so readers want to see the underlying comments

Structure: 2-4 sentences covering major themes, then minority perspectives.
End with a reflection that this is "one way of speaking about many experiences."

Respond with JSON: {"claims": [{"text": "...", "clusterIds": [0, 1], "commentCount": 150}]}`
        },
        {
          role: 'user',
          content: `Summarize these ${totalComments} comments across ${clusters.length} clusters:\n\n${clusterSummary}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return [{
        id: 0,
        text: `${totalComments} comments reveal varied experiences with this music.`,
        clusterIds: clusters.map(c => c.id),
        commentCount: totalComments
      }]
    }

    const parsed = JSON.parse(content)
    const claims = parsed.claims || [parsed]

    return claims.map((claim: { text?: string; clusterIds?: number[]; cluster_ids?: number[]; commentCount?: number; comment_count?: number }, i: number) => ({
      id: i,
      text: claim.text || '',
      clusterIds: claim.clusterIds || claim.cluster_ids || [],
      commentCount: claim.commentCount || claim.comment_count || 0
    }))
  } catch (error) {
    console.error('Failed to generate claims:', error)
    return [{
      id: 0,
      text: `${totalComments} comments reveal varied experiences with this music.`,
      clusterIds: clusters.map(c => c.id),
      commentCount: totalComments
    }]
  }
}




