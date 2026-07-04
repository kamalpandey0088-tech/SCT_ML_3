import { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'
import axios from 'axios'
import type { StatsResponse } from '../types'

interface AdminDashboardProps {
  isOpen: boolean
  onClose: () => void
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export default function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const backdropRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      gsap.to(backdropRef.current, { opacity: 1, duration: 0.3, ease: 'power2.out' })
      gsap.fromTo(modalRef.current, 
        { y: 50, scale: 0.95, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'power3.out' }
      )
      fetchStats()
    } else {
      document.body.style.overflow = ''
      gsap.to(backdropRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in' })
      gsap.to(modalRef.current, { y: 30, scale: 0.97, opacity: 0, duration: 0.3, ease: 'power3.in' })
    }
  }, [isOpen])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.get<StatsResponse>(`${API_BASE}/api/v1/stats`)
      setStats(data)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to load telemetry stats.')
    } finally {
      setLoading(false)
    }
  }

  const renderDashboard = () => {
    if (!stats) return null
    const catCount = stats.label_distribution.cat
    const dogCount = stats.label_distribution.dog
    const totalDist = catCount + dogCount
    
    // SVG bar widths
    const maxVal = Math.max(catCount, dogCount, 1)
    const catBarWidth = (catCount / maxVal) * 100
    const dogBarWidth = (dogCount / maxVal) * 100

    return (
      <div className="space-y-6 w-full animate-fade-in-up">
        {/* Quick cards grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass p-4 rounded-2xl flex flex-col gap-1 items-center">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Total Predictions</span>
            <span className="text-2xl font-bold font-mono text-white">{stats.total_predictions}</span>
          </div>
          <div className="glass p-4 rounded-2xl flex flex-col gap-1 items-center">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Predictions Today</span>
            <span className="text-2xl font-bold font-mono text-cyan-400">{stats.predictions_today}</span>
          </div>
          <div className="glass p-4 rounded-2xl flex flex-col gap-1 items-center">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Avg Confidence</span>
            <span className="text-2xl font-bold font-mono text-violet-400">{(stats.avg_confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="glass p-4 rounded-2xl flex flex-col gap-1 items-center">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">Accuracy (Feedback)</span>
            <span className="text-2xl font-bold font-mono text-green-400">
              {stats.accuracy_pct !== null ? `${stats.accuracy_pct.toFixed(1)}%` : 'No data'}
            </span>
          </div>
        </div>

        {/* Custom SVG Bar Chart */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Label Classification Spread</p>
          <div className="space-y-3">
            {/* Cats bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan-400">🐱 Cats ({catCount})</span>
                <span className="text-white/40">{totalDist > 0 ? ((catCount / totalDist) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  style={{ width: `${catBarWidth}%` }}
                />
              </div>
            </div>
            {/* Dogs bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-green-400">🐶 Dogs ({dogCount})</span>
                <span className="text-white/40">{totalDist > 0 ? ((dogCount / totalDist) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                  style={{ width: `${dogBarWidth}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Latency and System Info */}
        <div className="glass p-4 rounded-2xl flex items-center justify-between text-xs font-mono text-white/45">
          <span>Average Inference Latency</span>
          <span className="text-white font-bold">{stats.avg_inference_ms} ms</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md opacity-0"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50 glass-strong rounded-3xl p-6 overflow-y-auto flex flex-col items-center gap-5 opacity-0"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-sm font-mono text-cyan-400 tracking-wider uppercase">System Telemetry Log</span>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">✕</button>
        </div>

        {/* Content Box */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-xs font-mono text-white/30 uppercase tracking-widest">Polling analytics...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={fetchStats} className="btn-secondary text-xs">Retry</button>
          </div>
        ) : (
          renderDashboard()
        )}
      </div>
    </>
  )
}
