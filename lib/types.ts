export interface CallRecord {
  call_number: number
  call_date: string
  call_purpose: string
  caller_objective: string
  sentiment: string
  resolved: boolean
  had_booking: boolean
  customer_unhappy: boolean
  key_themes: string[] | string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  response: string
  results: CallRecord[]
}
