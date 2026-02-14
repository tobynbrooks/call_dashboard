'use client'

import { useState } from 'react'
import AudioPlayer from '@/components/AudioPlayer'
import TranscriptViewer from '@/components/TranscriptViewer'
import ResultsTable from '@/components/ResultsTable'
import ChatInterface from '@/components/ChatInterface'
import { CallRecord } from '@/lib/types'

export default function Home() {
  const [results, setResults] = useState<CallRecord[]>([])
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)

  return (
    <main className="h-screen p-4 lg:p-6 max-w-7xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-gray-900">
          Best Autocentres Call Analysis Dashboard
        </h1>
        <button
          onClick={() => setIsTranscriptOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View Transcript
        </button>
      </div>

      {/* Top section: Audio Player */}
      <div className="h-[280px] shrink-0">
        <AudioPlayer />
      </div>

      {/* Bottom section: Chat + Results side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <ChatInterface onResults={setResults} />
        <ResultsTable results={results} />
      </div>

      {/* Transcript Viewer Modal */}
      <TranscriptViewer isOpen={isTranscriptOpen} onClose={() => setIsTranscriptOpen(false)} />
    </main>
  )
}
