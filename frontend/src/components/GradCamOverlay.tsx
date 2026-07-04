import { useState } from 'react'

interface GradCamOverlayProps {
  imageUrl: string
  gradcamB64: string
  label: 'cat' | 'dog'
  className?: string
}

export default function GradCamOverlay({
  imageUrl,
  gradcamB64,
  label,
  className = ''
}: GradCamOverlayProps) {
  const [showHeatmap, setShowHeatmap] = useState(false)
  const isDog = label === 'dog'
  const glowBorder = isDog ? 'border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Visual Frame */}
      <div className={`relative w-64 h-64 rounded-2xl overflow-hidden border ${glowBorder} transition-shadow duration-300`}>
        {/* Original photo */}
        <img
          src={imageUrl}
          alt="Original file"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: showHeatmap ? 0 : 1 }}
        />
        
        {/* Grad-CAM overlay */}
        <img
          src={gradcamB64}
          alt="Grad-CAM activation overlay"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: showHeatmap ? 1 : 0 }}
        />
      </div>

      {/* Controller Toggle */}
      <button
        onClick={() => setShowHeatmap((p) => !p)}
        className={`px-4 py-2 rounded-xl text-xs font-mono border transition-all duration-300 ${
          showHeatmap 
            ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400' 
            : 'glass border-white/10 text-white/50 hover:text-white/80'
        }`}
      >
        {showHeatmap ? '👁️ Hide Attention Map' : '🧠 Show AI Attention Map'}
      </button>

      {showHeatmap && (
        <span className="text-[10px] font-mono text-white/30 tracking-wider uppercase animate-fade-in-up">
          Red/Yellow = Active Focus | Dark/Purple = Ignored
        </span>
      )}
    </div>
  )
}
