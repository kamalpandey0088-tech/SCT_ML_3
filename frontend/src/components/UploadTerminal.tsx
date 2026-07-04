import { useRef, useCallback, useState } from 'react'
import { gsap } from 'gsap'
import { usePredict } from '../hooks/usePredict'
import ScanAnimation from './ScanAnimation'
import ResultCard from './ResultCard'
import WebcamCapture from './WebcamCapture'
import SampleImages from './SampleImages'

interface UploadTerminalProps {
  onAddToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void
}

const VALID_TYPES = new Set(['image/jpeg', 'image/png'])
const MAX_MB = 10

export default function UploadTerminal({ onAddToast }: UploadTerminalProps) {
  const { state, predict, reset } = usePredict()
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [activeTab, setActiveTab] = useState<'upload' | 'webcam'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)
  const previewUrlRef = useRef<string>('')

  const breatheIn = useCallback(() => {
    if (!dropZoneRef.current) return
    gsap.to(dropZoneRef.current, {
      scale: 1.025,
      boxShadow: '0 0 70px rgba(6,182,212,0.45), 0 0 130px rgba(6,182,212,0.15)',
      duration: 0.4,
      ease: 'power2.out',
    })
  }, [])

  const breatheOut = useCallback(() => {
    if (!dropZoneRef.current) return
    gsap.to(dropZoneRef.current, {
      scale: 1,
      boxShadow: '0 0 0px rgba(6,182,212,0)',
      duration: 0.35,
      ease: 'power2.in',
    })
  }, [])

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      setClientError(null)

      if (!VALID_TYPES.has(file.type) && file.type !== 'image/svg+xml') {
        const err = 'Only JPEG and PNG images are supported.'
        setClientError(err)
        onAddToast(err, 'error')
        return
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        const err = `File exceeds ${MAX_MB} MB limit.`
        setClientError(err)
        onAddToast(err, 'error')
        return
      }

      previewUrlRef.current = URL.createObjectURL(file)
      predict(file)
    },
    [predict, onAddToast]
  )

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!isDragging) {
      setIsDragging(true)
      breatheIn()
    }
  }, [isDragging, breatheIn])

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
      breatheOut()
    }
  }, [breatheOut])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    breatheOut()
    handleFile(e.dataTransfer.files[0])
  }, [breatheOut, handleFile])

  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }, [handleFile])

  const openFilePicker = () => {
    if (state.status === 'idle' || state.status === 'error') {
      fileInputRef.current?.click()
    }
  }

  const renderIdle = () => (
    <div className="flex flex-col gap-6 w-full">
      {/* Upload Zone */}
      <div
        ref={dropZoneRef}
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(e) => e.key === 'Enter' && openFilePicker()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-5 w-full min-h-[260px]
          rounded-3xl cursor-pointer select-none transition-colors duration-300
          ${isDragging ? 'drop-zone-active' : 'drop-zone-idle'}`}
        style={{
          background: isDragging ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.015)',
        }}
      >
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragging ? 'scale-110' : ''
          }`}
          style={{
            background: isDragging ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(6,182,212,0.2)',
          }}
        >
          <svg
            className={`w-7 h-7 transition-colors duration-300 ${isDragging ? 'text-cyan-400' : 'text-white/25'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <div className="text-center px-4">
          <p className="text-white/70 font-semibold text-sm mb-1">
            {isDragging ? 'Release to upload' : 'Drop your image here'}
          </p>
          <p className="text-white/30 text-xs">
            or <span className="text-cyan-400 font-medium underline underline-offset-2">browse files</span>
          </p>
        </div>

        {/* Decorative elements */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
          <div
            key={corner}
            className={`absolute w-1.5 h-1.5 rounded-full bg-white/10 ${
              corner === 'tl' ? 'top-4 left-4' : ''
            } ${corner === 'tr' ? 'top-4 right-4' : ''} ${
              corner === 'bl' ? 'bottom-4 left-4' : ''
            } ${corner === 'br' ? 'bottom-4 right-4' : ''}`}
          />
        ))}
      </div>

      {/* Vector Samples */}
      <SampleImages onSelectSample={handleFile} />
    </div>
  )

  return (
    <div className="w-full max-w-lg mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={onFileInputChange}
      />

      {clientError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <span>⚠️</span>
          {clientError}
        </div>
      )}

      <div className="glass-strong rounded-3xl p-6 w-full" id="upload-terminal">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-[10px] font-mono text-white/20 ml-2 tracking-widest uppercase">
              Classifier Core
            </span>
          </div>

          {/* Navigation Tabs */}
          {state.status === 'idle' && (
            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1 text-[10px] font-mono rounded-md transition-all ${
                  activeTab === 'upload' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-white/40 hover:text-white/80'
                }`}
              >
                📁 Upload
              </button>
              <button
                onClick={() => setActiveTab('webcam')}
                className={`px-3 py-1 text-[10px] font-mono rounded-md transition-all ${
                  activeTab === 'webcam' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-white/40 hover:text-white/80'
                }`}
              >
                📷 Webcam
              </button>
            </div>
          )}
        </div>

        {/* Content Router */}
        {state.status === 'idle' && (
          activeTab === 'webcam' ? (
            <div className="min-h-[260px] flex flex-col items-center justify-center">
              <WebcamCapture 
                onCapture={(file) => {
                  setActiveTab('upload')
                  handleFile(file)
                }} 
                onClose={() => setActiveTab('upload')} 
              />
            </div>
          ) : (
            renderIdle()
          )
        )}

        {state.status === 'scanning' && (
          <ScanAnimation imageUrl={previewUrlRef.current} />
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-6 w-full min-h-[260px] justify-center text-center">
            <span className="text-3xl">🔴</span>
            <div>
              <p className="text-red-400 text-sm font-bold mb-1">Inference Aborted</p>
              <p className="text-white/40 text-xs max-w-sm">{state.message}</p>
            </div>
            <button onClick={reset} className="btn-secondary text-xs">Retry Sandbox</button>
          </div>
        )}

        {state.status === 'done' && (
          <ResultCard
            result={state.result}
            imageUrl={state.imageUrl}
            onReset={reset}
            onAddToast={onAddToast}
          />
        )}
      </div>
    </div>
  )
}
