'use client'

import { useState } from 'react'
import { CallRecord } from '@/lib/types'

interface ResultsTableProps {
  results: CallRecord[]
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Query Results
            {results.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({results.length} {results.length === 1 ? 'result' : 'results'})
              </span>
            )}
          </h2>
          {results.length > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Open Table
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Results from your queries will appear here
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                {results.length}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {results.length === 1 ? 'Call Found' : 'Calls Found'}
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Table Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">
                Query Results ({results.length} {results.length === 1 ? 'call' : 'calls'})
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6 min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[80px]">Call #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[100px]">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[150px]">Purpose</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[150px]">Caller Objective</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 min-w-[100px]">Sentiment</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 min-w-[100px]">Resolved</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 min-w-[100px]">Had Booking</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 min-w-[120px]">Customer Unhappy</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[200px]">Key Themes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr
                      key={row.call_number ?? i}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-indigo-600">
                        #{row.call_number}
                      </td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {row.call_date
                          ? new Date(row.call_date).toLocaleDateString('en-AU', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {row.call_purpose || '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {row.caller_objective || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.sentiment ? (
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            row.sentiment.toLowerCase() === 'positive' 
                              ? 'bg-green-100 text-green-700'
                              : row.sentiment.toLowerCase() === 'negative'
                              ? 'bg-red-100 text-red-700'
                              : row.sentiment.toLowerCase() === 'neutral'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {row.sentiment}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.resolved == null ? (
                          <span className="text-gray-400">—</span>
                        ) : row.resolved ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.had_booking == null ? (
                          <span className="text-gray-400">—</span>
                        ) : row.had_booking ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.customer_unhappy == null ? (
                          <span className="text-gray-400">—</span>
                        ) : row.customer_unhappy ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {row.key_themes ? (
                          Array.isArray(row.key_themes) ? (
                            <div className="flex flex-wrap gap-1">
                              {row.key_themes.map((theme, idx) => (
                                <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                                  {theme}
                                </span>
                              ))}
                            </div>
                          ) : (
                            row.key_themes
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
