import { useState } from 'react'
import axios from 'axios'

interface FeedbackButtonsProps {
  resultId: string
  onFeedbackSubmitted?: (message: string, type: 'success' | 'error') => void
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export default function FeedbackButtons({
  resultId,
  onFeedbackSubmitted
}: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const sendFeedback = async (correct: boolean) => {
    setLoading(true)
    try {
      await axios.post(`${API_BASE}/api/v1/feedback`, {
        result_id: resultId,
        correct
      })
      setSubmitted(true)
      onFeedbackSubmitted?.("Feedback registered. Thank you!", 'success')
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? "Could not register feedback."
      onFeedbackSubmitted?.(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-2 animate-fade-in-up">
        <span className="text-xs font-mono text-cyan-400">Thanks for contributing to model tuning! 🎉</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Was this correct?</span>
      <div className="flex gap-3">
        <button
          disabled={loading}
          onClick={() => sendFeedback(true)}
          className="px-4 py-1.5 rounded-lg border border-green-500/20 bg-green-500/5 text-xs text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
        >
          👍 Correct
        </button>
        <button
          disabled={loading}
          onClick={() => sendFeedback(false)}
          className="px-4 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          👎 Incorrect
        </button>
      </div>
    </div>
  )
}
