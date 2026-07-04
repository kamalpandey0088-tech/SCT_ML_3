import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import type { PredictionResponse } from '../types'
import GradCamOverlay from './GradCamOverlay'
import FeedbackButtons from './FeedbackButtons'

interface ResultCardProps {
  result: PredictionResponse
  imageUrl: string
  onReset: () => void
  onAddToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void
}

// ── Confetti System ───────────────────────────────────────────────────────────

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  color: string
  width: number
  height: number
  opacity: number
  life: number
}

function launchConfetti(canvas: HTMLCanvasElement, label: 'cat' | 'dog'): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => undefined

  const palette =
    label === 'dog'
      ? ['#22c55e', '#4ade80', '#86efac', '#ffffff', '#a3e635', '#d9f99d']
      : ['#06b6d4', '#38bdf8', '#7dd3fc', '#ffffff', '#818cf8', '#c4b5fd']

  const particles: ConfettiParticle[] = Array.from({ length: 90 }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 4 + Math.random() * 10
    return {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      color: palette[Math.floor(Math.random() * palette.length)],
      width: 6 + Math.random() * 8,
      height: 3 + Math.random() * 4,
      opacity: 1,
      life: 1,
    }
  })

  let animFrame: number
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let anyAlive = false
    for (const p of particles) {
      if (p.life <= 0) continue
      anyAlive = true

      p.x += p.vx
      p.y += p.vy
      p.vy += 0.25 // gravity
      p.vx *= 0.99 // drag
      p.rotation += p.rotationSpeed
      p.life -= 0.012
      p.opacity = Math.max(0, p.life)

      ctx.save()
      ctx.globalAlpha = p.opacity
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height)
      ctx.restore()
    }

    if (anyAlive) {
      animFrame = requestAnimationFrame(tick)
    }
  }

  animFrame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(animFrame)
}

// ── Progress Ring ─────────────────────────────────────────────────────────────

interface ProgressRingProps {
  pct: number
  color: string
  size?: number
}

function ProgressRing({ pct, color, size = 120 }: ProgressRingProps) {
  const radius = (size - 12) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (pct / 100) * circumference

  return (
    <svg width={size} height={size} aria-label={`${pct.toFixed(1)}% confidence`}>
      <circle
        className="progress-ring-track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={6}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
      />
      <circle
        className="progress-ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={6}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        style={{
          strokeDasharray: `${circumference} ${circumference}`,
          strokeDashoffset,
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
          transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1)',
          filter: `drop-shadow(0 0 6px ${color}88)`,
        }}
      />
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResultCard({ result, imageUrl, onReset, onAddToast }: ResultCardProps) {
  const { label, confidence_pct, probabilities, inference_ms, result_id, gradcam_b64 } = result
  const isDog = label === 'dog'

  const accentColor = isDog ? '#22c55e' : '#06b6d4'
  const glowClass = isDog ? 'glow-border-green' : 'glow-border-cyan'
  const borderColorClass = isDog ? 'border-green-500/30' : 'border-cyan-500/30'
  const bgColorClass = isDog ? 'bg-green-500/5' : 'bg-cyan-500/5'

  const cardRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [displayedPct, setDisplayedPct] = useState(0)
  const [ringPct, setRingPct] = useState(0)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    gsap.fromTo(
      card,
      { opacity: 0, y: 40, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }
    )

    const counter = { val: 0 }
    gsap.to(counter, {
      val: confidence_pct,
      duration: 1.8,
      ease: 'power2.out',
      delay: 0.4,
      onUpdate: () => setDisplayedPct(Math.min(100, counter.val)),
    })

    const timer = setTimeout(() => setRingPct(confidence_pct), 300)

    const canvas = canvasRef.current
    let cleanup: (() => void) | undefined
    if (canvas) {
      const rect = card.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      cleanup = launchConfetti(canvas, label)
    }

    return () => {
      clearTimeout(timer)
      cleanup?.()
    }
  }, [confidence_pct, label])

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/share/${result_id}`
    navigator.clipboard.writeText(shareUrl).then(
      () => onAddToast("Share link copied to clipboard!", "success"),
      () => onAddToast("Could not copy link to clipboard.", "error")
    )
  }

  const handleReset = () => {
    URL.revokeObjectURL(imageUrl)
    onReset()
  }

  return (
    <div
      ref={cardRef}
      id="result-card"
      className={`relative w-full max-w-lg rounded-3xl glass overflow-hidden border ${borderColorClass} ${glowClass}`}
      style={{ opacity: 0 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />

      <div className={`${bgColorClass} px-6 pt-6 pb-5 border-b ${borderColorClass}`}>
        <div className="flex items-center justify-between mb-4">
          <span className="section-tag">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
            Prediction Result
          </span>
          <span className="text-xs font-mono text-white/30">{inference_ms.toFixed(1)} ms</span>
        </div>

        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Main info row */}
          <div className="flex items-center gap-6 w-full">
            {/* Grad-CAM Toggle Overlay OR static thumb */}
            {gradcam_b64 ? (
              <GradCamOverlay imageUrl={imageUrl} gradcamB64={gradcam_b64} label={label} className="flex-shrink-0" />
            ) : (
              <div className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border ${borderColorClass}`}>
                <img src={imageUrl} alt="Classified" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl">{isDog ? '🐶' : '🐱'}</span>
                <h2 className="text-3xl font-bold capitalize" style={{ color: accentColor }}>{label}</h2>
              </div>
              <p className="text-white/45 text-xs font-light leading-relaxed">
                {isDog ? 'RBF SVM classified image features as Canis lupus familiaris.' : 'RBF SVM classified image features as Felis catus.'}
              </p>
            </div>

            <div className="flex-shrink-0 relative">
              <ProgressRing pct={ringPct} color={accentColor} size={88} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono leading-none" style={{ color: accentColor }}>
                  {displayedPct.toFixed(1)}
                </span>
                <span className="text-white/40 text-xs">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Probabilities progress track */}
      <div className="px-6 py-5 space-y-3">
        {(['cat', 'dog'] as const).map((cls) => {
          const pct = (probabilities[cls] * 100)
          const isWinner = cls === label
          const clsColor = cls === 'dog' ? '#22c55e' : '#06b6d4'
          return (
            <div key={cls} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className={`font-semibold capitalize ${isWinner ? '' : 'text-white/40'}`} style={isWinner ? { color: clsColor } : undefined}>
                  {cls === 'dog' ? '🐶' : '🐱'} {cls}
                </span>
                <span className="font-mono text-[10px]" style={isWinner ? { color: clsColor } : { color: 'rgba(255,255,255,0.3)' }}>
                  {pct.toFixed(2)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: isWinner ? `linear-gradient(90deg, ${clsColor}88, ${clsColor})` : 'rgba(255,255,255,0.1)',
                    transition: 'width 1.8s cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Feedback loggers & sharing */}
      <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex flex-col items-center gap-4">
        <FeedbackButtons 
          resultId={result_id} 
          onFeedbackSubmitted={(msg, type) => onAddToast(msg, type)} 
        />
        
        <div className="flex justify-between w-full items-center">
          <button
            onClick={copyShareLink}
            className="btn-secondary text-[10px] py-1.5 px-3 uppercase tracking-wider font-mono"
          >
            🔗 Copy Share Link
          </button>
          
          <button
            id="result-reset-btn"
            onClick={handleReset}
            className="btn-primary text-[10px] py-1.5 px-4 uppercase tracking-wider font-mono"
          >
            Reset Terminal
          </button>
        </div>
      </div>
    </div>
  )
}
