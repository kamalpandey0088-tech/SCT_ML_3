import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useHistory } from '../hooks/useHistory'

interface PredictionHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export default function PredictionHistory({ isOpen, onClose }: PredictionHistoryProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const { history, total, page, pages, loading, fetchPage } = useHistory()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      gsap.to(backdropRef.current, { opacity: 1, duration: 0.35, ease: 'power2.out' })
      gsap.to(panelRef.current, { x: 0, duration: 0.45, ease: 'power3.out' })
    } else {
      document.body.style.overflow = ''
      gsap.to(backdropRef.current, { opacity: 0, duration: 0.3, ease: 'power2.in' })
      gsap.to(panelRef.current, { x: '100%', duration: 0.35, ease: 'power3.in' })
    }
  }, [isOpen])

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm pointer-events-auto opacity-0"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-[#0a0a0a] border-l border-white/5 shadow-2xl p-6 flex flex-col translate-x-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-white font-sans">Prediction Log</h3>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{total} items total</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-lg">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="glass rounded-2xl p-4 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl skeleton flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton w-1/3 rounded" />
                  <div className="h-3 skeleton w-2/3 rounded" />
                </div>
              </div>
            ))
          ) : history.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-white/30 gap-2">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-mono uppercase tracking-wider">No logs available</p>
              <p className="text-xs">Run a prediction to populate history.</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="glass hover:border-white/10 rounded-2xl p-4 flex gap-4 items-center transition-all duration-300 group"
              >
                {/* Thumb */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex-shrink-0">
                  {item.gradcam_b64 ? (
                    <img src={item.gradcam_b64} alt="Thumb" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs bg-cyan-900/10 text-cyan-400">🐾</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold capitalize">
                      {item.label === 'dog' ? '🐶 Dog' : '🐱 Cat'}
                    </span>
                    <span className="text-xs font-mono text-white/40">{item.confidence_pct}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/20">
                    <span>{formatDate(item.created_at)}</span>
                    {item.has_feedback && (
                      <span className={item.feedback_correct ? 'text-green-500/80' : 'text-red-500/80'}>
                        {item.feedback_correct ? '✓ correct' : '✗ wrong'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination controls */}
        {pages > 1 && (
          <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between font-mono text-xs text-white/40">
            <button
              disabled={page === 1}
              onClick={() => fetchPage(page - 1)}
              className="px-3 py-1.5 rounded-lg glass disabled:opacity-30 hover:text-white transition-colors"
            >
              ◀ Prev
            </button>
            <span>Page {page} of {pages}</span>
            <button
              disabled={page === pages}
              onClick={() => fetchPage(page + 1)}
              className="px-3 py-1.5 rounded-lg glass disabled:opacity-30 hover:text-white transition-colors"
            >
              Next ▶
            </button>
          </div>
        )}
      </div>
    </>
  )
}
