import { useEffect, useRef, useState } from 'react'

interface WebcamCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activeStream: MediaStream | null = null

    async function initCamera() {
      try {
        setError(null)
        if (activeStream) {
          activeStream.getTracks().forEach((track) => track.stop())
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: facingMode
          }
        })
        
        setStream(newStream)
        activeStream = newStream
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream
        }
      } catch (err: any) {
        setError("Camera permission denied or camera device is occupied.")
      }
    }

    initCamera()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [facingMode])

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !stream) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
      }
    }, 'image/jpeg', 0.9)
  }

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-strong rounded-3xl overflow-hidden p-6 flex flex-col items-center gap-5">
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-sm font-mono text-cyan-400 tracking-wider uppercase">Live Camera Sandbox</span>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">✕</button>
        </div>

        {/* Video feed viewport */}
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
          {error ? (
            <p className="text-red-400 text-sm px-6 text-center">{error}</p>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {/* Tactical camera UI target reticle */}
              <div className="absolute inset-8 border border-cyan-400/20 pointer-events-none rounded-lg" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none">
                <div className="absolute top-0 bottom-0 left-3.5 right-3.5 border-l border-cyan-400/40" />
                <div className="absolute top-3.5 bottom-3.5 left-0 right-0 border-t border-cyan-400/40" />
              </div>
            </>
          )}
        </div>

        {/* Actions panel */}
        {!error && (
          <div className="flex gap-4 w-full">
            <button
              onClick={toggleCamera}
              className="btn-secondary flex-1 py-3 text-xs"
              aria-label="Switch camera lens"
            >
              🔄 Switch Camera
            </button>
            <button
              onClick={capturePhoto}
              className="btn-primary flex-1 py-3 text-xs"
              aria-label="Snap photo"
            >
              📸 Capture Frame
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
