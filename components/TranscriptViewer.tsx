'use client'

import { useState, useEffect } from 'react'

interface TranscriptData {
  callNumber: number
  date: string
  transcriptText: string
}

interface TranscriptViewerProps {
  isOpen: boolean
  onClose: () => void
}

export default function TranscriptViewer({ isOpen, onClose }: TranscriptViewerProps) {
  const [callNumber, setCallNumber] = useState('')
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const fetchTranscript = async () => {
    if (!callNumber.trim()) return

    setLoading(true)
    setError('')
    setTranscriptData(null)

    try {
      const res = await fetch(`/api/call/transcript?callNumber=${callNumber}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch transcript')
        return
      }

      setTranscriptData(data)
    } catch {
      setError('Failed to fetch transcript')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchTranscript()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Transcript Viewer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex flex-col flex-1 min-h-0">
          <div className="flex gap-2 mb-4">
            <label className="text-sm font-medium text-gray-700 self-center whitespace-nowrap">
              Call #:
            </label>
            <input
              type="number"
              value={callNumber}
              onChange={(e) => setCallNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 1"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={fetchTranscript}
              disabled={loading || !callNumber.trim()}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Fetch'}
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            {transcriptData && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="text-sm text-gray-600 mb-2 shrink-0">
                  <span className="font-medium">Call #{transcriptData.callNumber}</span>
                  {' — '}
                  {new Date(transcriptData.date).toLocaleDateString('en-AU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-50 rounded-md border border-gray-200 p-3 min-h-0">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {transcriptData.transcriptText}
                  </pre>
                </div>
              </div>
            )}

            {!transcriptData && !error && !loading && (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                Enter a call number to load transcript
              </div>
            )}

            {loading && (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                Loading transcript...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
