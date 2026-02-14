import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const callNumber = request.nextUrl.searchParams.get('callNumber')

  if (!callNumber) {
    return NextResponse.json(
      { error: 'callNumber parameter is required' },
      { status: 400 }
    )
  }

  const num = parseInt(callNumber, 10)
  if (isNaN(num)) {
    return NextResponse.json(
      { error: 'callNumber must be a number' },
      { status: 400 }
    )
  }

  const { data, error } = await getSupabase()
    .from('call_analysis')
    .select('call_number, call_date, audio_url, filename')
    .eq('call_number', num)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: `Call #${num} not found` },
      { status: 404 }
    )
  }

  if (!data.audio_url) {
    return NextResponse.json(
      { error: `No audio available for call #${num}` },
      { status: 404 }
    )
  }

  return NextResponse.json({
    callNumber: data.call_number,
    date: data.call_date,
    audioUrl: data.audio_url,
    filename: data.filename,
  })
}
