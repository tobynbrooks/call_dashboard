import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabase } from '@/lib/supabase'
import { CallRecord, Message } from '@/lib/types'

const SYSTEM_PROMPT = `You are a SQL expert analyzing call data. Convert user questions to PostgreSQL queries.

Database Schema:
Table: call_analysis
Columns:
  - call_number (int, unique identifier 1-N)
  - filename (text)
  - audio_url (text, URL to MP3)
  - transcript_url (text, URL to transcript)
  - transcript_text (text, full transcript content)
  - duration_seconds (int)
  - call_date (timestamptz)
  - call_purpose (text)
  - caller_objective (text)
  - sentiment (text)
  - key_themes (text[], PostgreSQL array)
  - resolved (boolean)
  - had_booking (boolean)
  - customer_unhappy (boolean)

Rules:
- Only generate SELECT queries (no INSERT, UPDATE, DELETE, DROP, ALTER, etc.)
- Always include call_number in results
- Order results by call_date DESC unless specified otherwise
- Default result columns: call_number, call_date, call_purpose, caller_objective, sentiment, resolved, had_booking, customer_unhappy, key_themes
- For text array searches on key_themes, use ANY() or @> operators
- When searching transcript_text, use ILIKE for case-insensitive matching

IMPORTANT: Your response MUST contain exactly one SQL query wrapped in \`\`\`sql code blocks.
After the SQL block, provide a brief natural language explanation of what the query does.
Do NOT include multiple SQL blocks. Only one query per response.`

function extractSQL(text: string): string | null {
  const sqlMatch = text.match(/```sql\s*([\s\S]*?)```/)
  if (!sqlMatch) return null
  return sqlMatch[1].trim()
}

function isReadOnlyQuery(sql: string): boolean {
  const normalized = sql.trim().toUpperCase()
  const forbidden = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER',
    'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC',
  ]
  if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
    return false
  }
  for (const keyword of forbidden) {
    const regex = new RegExp(`\\b${keyword}\\b`)
    if (regex.test(normalized)) {
      return false
    }
  }
  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory } = body as {
      message: string
      conversationHistory: Message[]
    }

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    // Build messages for Claude
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...conversationHistory.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract SQL from response
    const sql = extractSQL(assistantMessage)

    if (!sql) {
      return NextResponse.json({
        response: assistantMessage,
        results: [],
      })
    }

    // Validate read-only
    if (!isReadOnlyQuery(sql)) {
      return NextResponse.json({
        response:
          'I can only run SELECT queries for safety. Please ask a read-only question about the data.',
        results: [],
      })
    }

    // Execute raw SQL via Supabase RPC function
    // Requires execute_sql function to exist in Supabase (see README)
    let results: CallRecord[] = []

    const { data, error } = await getSupabase().rpc('execute_sql', {
      query: sql,
    })

    if (error) {
      console.error('SQL execution error:', error)
      return NextResponse.json({
        response:
          assistantMessage.replace(/```sql[\s\S]*?```/g, '').trim() +
          '\n\n(Note: There was an error executing the query. The database may not support this query format.)',
        results: [],
      })
    }

    results = Array.isArray(data) ? data : data ? [data] : []

    // Remove the SQL block from the response shown to user
    const cleanResponse = assistantMessage
      .replace(/```sql[\s\S]*?```/g, '')
      .trim()

    return NextResponse.json({
      response: cleanResponse,
      results,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process your question' },
      { status: 500 }
    )
  }
}
