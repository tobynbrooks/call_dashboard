'use client'

import { useState, useRef, useEffect } from 'react'
import { Message, CallRecord } from '@/lib/types'

interface ChatInterfaceProps {
  onResults: (results: CallRecord[]) => void
}

export default function ChatInterface({ onResults }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fullAnalysisMode, setFullAnalysisMode] = useState(false)
  const [sampleSize, setSampleSize] = useState(10)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationHistory: messages,
          fullAnalysisMode,
          sampleSize,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg: Message = {
          role: 'assistant',
          content: data.error || 'Something went wrong.',
        }
        setMessages([...updatedMessages, errorMsg])
        return
      }

      const resultCount = data.results?.length || 0
      const responseText =
        data.response +
        (resultCount > 0
          ? `\n\n(${resultCount} ${resultCount === 1 ? 'result' : 'results'} found)`
          : '')

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText,
      }
      setMessages([...updatedMessages, assistantMessage])

      if (data.results && data.results.length > 0) {
        onResults(data.results)
      }
    } catch {
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Failed to connect to the server.',
      }
      setMessages([...updatedMessages, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col h-full">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            AI Query Chat
          </h2>
          <button
            onClick={() => setFullAnalysisMode(!fullAnalysisMode)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              fullAnalysisMode
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Full Analysis Mode - Beta!
          </button>
        </div>
        
        {fullAnalysisMode && (
          <div className="flex items-center gap-3 px-2 py-2 bg-red-50 rounded-md border border-red-200">
            <span className="text-xs font-medium text-red-700 whitespace-nowrap">
              Sample Size:
            </span>
            <input
              type="range"
              min="10"
              max="20"
              step="10"
              value={sampleSize}
              onChange={(e) => setSampleSize(parseInt(e.target.value))}
              className="flex-1 h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <span className="text-xs font-bold text-red-700 min-w-[2rem] text-center">
              {sampleSize}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mb-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-8">
            Ask questions about your calls. Try: &quot;Show me all booking calls&quot;
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-sm">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your calls..."
          disabled={loading}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
