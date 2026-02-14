import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabase } from '@/lib/supabase'
import { CallRecord, Message } from '@/lib/types'

const SQL_SYSTEM_PROMPT = `You are a SQL expert analyzing call data. Convert user questions to PostgreSQL queries.

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

const ANALYSIS_SYSTEM_PROMPT = `You are an expert call analyst with deep understanding of customer service conversations.

You work in TWO PHASES:

PHASE 1 (Metadata Analysis):
- You receive metadata for ALL calls in the database (call_purpose, sentiment, themes, etc.)
- Identify patterns, categories, and trends across the COMPLETE dataset
- Provide statistical summaries (e.g., "X% of calls are bookings, Y% are complaints")
- Select 3-5 representative call numbers per category that would be good examples
- Format your sample selection as: SAMPLE_CALLS: [123, 456, 789, ...]

PHASE 2 (Detailed Transcript Analysis):
- You receive full transcripts for the sample calls you selected
- Read actual conversations to understand HOW agents handle each category
- Quote specific examples from transcripts to illustrate patterns
- Combine Phase 1 statistics with Phase 2 detailed insights
- Provide actionable recommendations based on real conversation patterns

Key principles:
- Always mention the TOTAL dataset size (e.g., "Out of 197 total calls...")
- Use statistics from Phase 1 for big picture
- Use transcript details from Phase 2 for specific examples
- Be comprehensive but focus on actionable insights
- Reference specific call numbers when quoting conversations
- Identify automatable vs. human-required interactions`

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
    const { message, conversationHistory, fullAnalysisMode = false, sampleSize = 10 } = body as {
      message: string
      conversationHistory: Message[]
      fullAnalysisMode?: boolean
      sampleSize?: number
    }

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // FULL ANALYSIS MODE: Two-Phase Analysis (metadata first, then sample transcripts)
    if (fullAnalysisMode) {
      // PHASE 1: Get ALL calls with metadata only (no transcripts)
      const metadataQuery = `
        SELECT 
          call_number, call_date, call_purpose, caller_objective, 
          sentiment, resolved, had_booking, customer_unhappy, key_themes,
          duration_seconds, filename
        FROM call_analysis 
        ORDER BY call_date DESC
      `

      const { data: metadataData, error: metadataError } = await getSupabase().rpc('execute_sql', {
        query: metadataQuery,
      })

      if (metadataError || !metadataData || (Array.isArray(metadataData) && metadataData.length === 0)) {
        return NextResponse.json({
          response: 'No calls found in the database.',
          results: [],
        })
      }

      const allCalls = Array.isArray(metadataData) ? metadataData : [metadataData]

      // Build metadata context for Phase 1 analysis
      let metadataContext = `PHASE 1 ANALYSIS: Here is metadata for ALL ${allCalls.length} calls in the database:\n\n`
      allCalls.forEach((call: any) => {
        metadataContext += `Call #${call.call_number}: ${call.call_purpose || 'Unknown'} | `
        metadataContext += `Objective: ${call.caller_objective || 'N/A'} | `
        metadataContext += `Sentiment: ${call.sentiment || 'N/A'} | `
        metadataContext += `Resolved: ${call.resolved ? 'Yes' : 'No'} | `
        metadataContext += `Booking: ${call.had_booking ? 'Yes' : 'No'} | `
        metadataContext += `Unhappy: ${call.customer_unhappy ? 'Yes' : 'No'} | `
        metadataContext += `Duration: ${call.duration_seconds}s | `
        metadataContext += `Themes: ${Array.isArray(call.key_themes) ? call.key_themes.join(', ') : call.key_themes || 'None'}\n`
      })

      metadataContext += `\n\nBased on this complete dataset, answer the user's question: "${message}"\n\n`
      metadataContext += `After your analysis, identify representative call numbers that would be good examples to examine transcripts for (aim for around ${sampleSize} total samples across all categories). Format them as: SAMPLE_CALLS: [123, 456, 789]`

      // Phase 1: Metadata analysis
      const phase1Messages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: metadataContext },
      ]

      const phase1Response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3096,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: phase1Messages,
      })

      const phase1Analysis =
        phase1Response.content[0].type === 'text' ? phase1Response.content[0].text : ''

      // Extract sample call numbers from Phase 1 response
      const sampleMatch = phase1Analysis.match(/SAMPLE_CALLS:\s*\[([\d,\s]+)\]/)
      let sampleCallNumbers: number[] = []
      
      if (sampleMatch) {
        sampleCallNumbers = sampleMatch[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
      }

      // If no samples identified or too many, pick representative ones
      if (sampleCallNumbers.length === 0 || sampleCallNumbers.length > sampleSize * 2) {
        // Fallback: Pick diverse samples based on different categories
        const samples: any[] = []
        const byPurpose: { [key: string]: any[] } = {}
        
        allCalls.forEach((call: any) => {
          const purpose = call.call_purpose || 'Unknown'
          if (!byPurpose[purpose]) byPurpose[purpose] = []
          byPurpose[purpose].push(call)
        })
        
        // Get samples from each purpose category
        const categories = Object.keys(byPurpose)
        const samplesPerCategory = Math.ceil(sampleSize / categories.length)
        categories.forEach(purpose => {
          const callsInCategory = byPurpose[purpose]
          samples.push(...callsInCategory.slice(0, samplesPerCategory))
        })
        
        sampleCallNumbers = samples.map(c => c.call_number).slice(0, sampleSize)
      }

      // PHASE 2: Fetch full transcripts for sample calls
      if (sampleCallNumbers.length > 0) {
        const transcriptQuery = `
          SELECT 
            call_number, call_date, call_purpose, caller_objective, 
            sentiment, resolved, had_booking, customer_unhappy, key_themes,
            transcript_text
          FROM call_analysis 
          WHERE call_number IN (${sampleCallNumbers.join(',')})
        `

        const { data: transcriptData, error: transcriptError } = await getSupabase().rpc('execute_sql', {
          query: transcriptQuery,
        })

        if (!transcriptError && transcriptData) {
          const sampleCalls = Array.isArray(transcriptData) ? transcriptData : [transcriptData]
          
          // Build Phase 2 context with sample transcripts
          let phase2Context = `PHASE 2 ANALYSIS: Here are the full transcripts for ${sampleCalls.length} representative sample calls:\n\n`
          
          sampleCalls.forEach((call: any) => {
            phase2Context += `===== Call #${call.call_number} =====\n`
            phase2Context += `Purpose: ${call.call_purpose || 'N/A'}\n`
            phase2Context += `Objective: ${call.caller_objective || 'N/A'}\n`
            phase2Context += `Sentiment: ${call.sentiment || 'N/A'}\n`
            phase2Context += `Resolved: ${call.resolved ? 'Yes' : 'No'}\n\n`
            phase2Context += `FULL TRANSCRIPT:\n${call.transcript_text || 'No transcript available'}\n\n`
            phase2Context += `---\n\n`
          })

          phase2Context += `\nNow provide a comprehensive final answer combining:\n`
          phase2Context += `1. Your analysis of ALL ${allCalls.length} calls (from Phase 1 metadata)\n`
          phase2Context += `2. Detailed insights from these ${sampleCalls.length} example transcripts\n`
          phase2Context += `3. Specific recommendations based on actual conversation patterns\n\n`
          phase2Context += `User Question: ${message}`

          // Phase 2: Detailed analysis with transcripts
          const phase2Messages: { role: 'user' | 'assistant'; content: string }[] = [
            ...conversationHistory.map((msg: Message) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: 'user', content: `${phase1Analysis}\n\n${phase2Context}` },
          ]

          const phase2Response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: ANALYSIS_SYSTEM_PROMPT,
            messages: phase2Messages,
          })

          const finalAnalysis =
            phase2Response.content[0].type === 'text'
              ? phase2Response.content[0].text
              : ''

          // Clean up the SAMPLE_CALLS marker from response
          const cleanedAnalysis = finalAnalysis.replace(/SAMPLE_CALLS:\s*\[[\d,\s]+\]/g, '').trim()

          return NextResponse.json({
            response: `📊 Analyzed ALL ${allCalls.length} calls (metadata) + ${sampleCalls.length} detailed transcript examples\n\n${cleanedAnalysis}`,
            results: sampleCalls,
          })
        }
      }

      // Fallback: If Phase 2 fails, return Phase 1 results
      const cleanedPhase1 = phase1Analysis.replace(/SAMPLE_CALLS:\s*\[[\d,\s]+\]/g, '').trim()
      return NextResponse.json({
        response: `📊 Analyzed ALL ${allCalls.length} calls (metadata only)\n\n${cleanedPhase1}`,
        results: allCalls.slice(0, 50),
      })
    }

    // STANDARD SQL MODE: Generate and execute SQL query
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...conversationHistory.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SQL_SYSTEM_PROMPT,
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
