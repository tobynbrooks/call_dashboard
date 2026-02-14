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
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        AI Query Chat
      </h2>

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
