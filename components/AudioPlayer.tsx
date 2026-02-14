'use client'

import { useState } from 'react'

interface AudioData {
  callNumber: number
  date: string
  audioUrl: string
  filename: string
}

export default function AudioPlayer() {
  const [callNumber, setCallNumber] = useState('')
  const [audioData, setAudioData] = useState<AudioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAudio = async () => {
    if (!callNumber.trim()) return

    setLoading(true)
    setError('')
    setAudioData(null)

    try {
      const res = await fetch(`/api/call/audio?callNumber=${callNumber}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch audio')
        return
      }

      setAudioData(data)
    } catch {
      setError('Failed to fetch audio')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchAudio()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-full flex flex-col">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Audio Player
      </h2>

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
          onClick={fetchAudio}
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

        {audioData && (
          <div className="flex flex-col gap-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Call #{audioData.callNumber}</span>
              {' — '}
              {new Date(audioData.date).toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <audio
              controls
              src={audioData.audioUrl}
              className="w-full"
              preload="metadata"
            />
            <div className="text-xs text-gray-400 truncate">
              {audioData.filename}
            </div>
          </div>
        )}

        {!audioData && !error && !loading && (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Enter a call number to load audio
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Loading audio...
          </div>
        )}
      </div>
    </div>
  )
}
