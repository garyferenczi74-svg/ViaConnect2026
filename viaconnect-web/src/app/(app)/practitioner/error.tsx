'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PractitionerError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('[error-boundary][practitioner]', {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#1A2744]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#B75E18]/10 mb-4 sm:mb-6">
          <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#B75E18]" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A2744] mb-2 sm:mb-3">
          Something went wrong
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
          We encountered an unexpected issue loading the practitioner portal. Please try again, and if the problem persists, refresh the page.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 sm:py-3 bg-[#2DA5A0] hover:bg-[#258A85] text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} />
          Try again
        </button>
      </div>
    </div>
  )
}
